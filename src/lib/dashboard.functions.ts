import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const CONFIRMED_STATUSES = ["pending", "confirmed"] as const;
const REVENUE_STATUSES = ["pending", "confirmed", "completed"] as const;

const ensureAdmin = async (ctx: { supabase: any; userId: string }) => {
  const { data, error } = await ctx.supabase.rpc("has_role", {
    _user_id: ctx.userId,
    _role: "admin",
  });
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Forbidden");
};

const todayISO = () => new Date().toISOString().slice(0, 10);
const addDays = (d: Date, n: number) => {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
};
const monthStart = (d = new Date()) =>
  new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
const monthEnd = (d = new Date()) =>
  new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().slice(0, 10);

// SEMANTIKA: `to` yra EKSLUZYVI riba. Rezervacija 05-10 → 05-11 = 1 para.
// Filtras 05-10 → 05-11 (eksluz.) = 1 para. Filtras 05-10 → 11-10 = 184 paros.

function bookingNights(from: string, to: string) {
  const a = new Date(from + "T00:00:00Z").getTime();
  const b = new Date(to + "T00:00:00Z").getTime();
  return Math.max(1, Math.round((b - a) / 86400000));
}

// Kiek parų rezervacija [from, to) patenka į [rangeFrom, rangeTo) intervalą.
function overlapDays(from: string, to: string, rangeFrom: string, rangeTo: string) {
  const af = new Date(from + "T00:00:00Z").getTime();
  const at = new Date(to + "T00:00:00Z").getTime();
  const rf = new Date(rangeFrom + "T00:00:00Z").getTime();
  const rt = new Date(rangeTo + "T00:00:00Z").getTime();
  const start = Math.max(af, rf);
  const end = Math.min(at, rt);
  const nights = Math.round((end - start) / 86400000);
  return Math.max(0, nights);
}

const periodInput = z
  .object({
    from: z.string().nullable().optional(),
    to: z.string().nullable().optional(),
  })
  .optional();

// `to` eksluzyvi → days = (to - from) / dienos.
// Pvz. gegužė (05-01 → 06-01) = 31, birželis (06-01 → 07-01) = 30.
function resolveRange(input?: { from?: string | null; to?: string | null } | null) {
  const from = input?.from ?? "2000-01-01";
  const to = input?.to ?? (() => {
    // Default `to` = rytoj (eksluzyvi), kad apimtų šiandieną.
    const t = new Date();
    const tomorrow = new Date(t.getFullYear(), t.getMonth(), t.getDate() + 1);
    return tomorrow.toISOString().slice(0, 10);
  })();
  const days = Math.max(
    1,
    Math.round(
      (new Date(to + "T00:00:00Z").getTime() -
        new Date(from + "T00:00:00Z").getTime()) /
        86400000,
    ),
  );
  return { from, to, days };
}


// === Operations tab ===
export const getDashboardOverview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => periodInput.parse(d))
  .handler(async ({ context, data }) => {
    await ensureAdmin(context);
    const today = todayISO();
    const { from: rFrom, to: rTo, days: rDays } = resolveRange(data);
    const in30 = addDays(new Date(), 30).toISOString().slice(0, 10);
    const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const [cars, todayBusy, periodBookings, upcoming, pendingPayments, newest, todayPickups, todayReturns, utilRows] =
      await Promise.all([
        context.supabase.from("cars").select("id, name, cover_image_url").eq("is_active", true),
        context.supabase
          .from("bookings")
          .select("car_id")
          .neq("status", "cancelled")
          .lte("date_from", today)
          .gt("date_to", today),
        context.supabase
          .from("bookings")
          .select("total_amount, date_from, date_to, status")
          .in("status", REVENUE_STATUSES as unknown as string[])
          .gte("date_from", rFrom)
          .lt("date_from", rTo),
        context.supabase
          .from("bookings")
          .select("total_amount")
          .in("status", CONFIRMED_STATUSES as unknown as string[])
          .gte("date_from", today)
          .lte("date_from", in30),
        context.supabase
          .from("bookings")
          .select("id, total_amount, customer_name, customer_phone, date_from, cars(name)")
          .eq("status", "pending")
          .gte("date_from", rFrom)
          .lt("date_from", rTo)
          .order("date_from", { ascending: true })
          .limit(20),
        context.supabase
          .from("bookings")
          .select("id, customer_name, customer_phone, total_amount, status, date_from, date_to, created_at, cars(name)")
          .gte("created_at", last24h)
          .order("created_at", { ascending: false })
          .limit(10),
        context.supabase
          .from("bookings")
          .select("id, customer_name, customer_phone, pickup_time, pickup_location, total_amount, status, cars(name)")
          .eq("date_from", today)
          .neq("status", "cancelled")
          .order("pickup_time", { ascending: true }),
        context.supabase
          .from("bookings")
          .select("id, customer_name, customer_phone, return_time, return_location, status, cars(name)")
          .eq("date_to", today)
          .neq("status", "cancelled")
          .order("return_time", { ascending: true }),
        context.supabase
          .from("bookings")
          .select("car_id, date_from, date_to, status")
          .in("status", REVENUE_STATUSES as unknown as string[])
          .lt("date_from", rTo)
          .gt("date_to", rFrom),

      ]);

    if (cars.error) throw new Error(cars.error.message);

    const totalCars = cars.data?.length ?? 0;
    const busyCarIds = new Set((todayBusy.data ?? []).map((r: any) => r.car_id));
    const freeToday = totalCars - busyCarIds.size;

    const periodBks = (periodBookings.data ?? []) as any[];
    const revenueMTD = periodBks.reduce((s, b) => s + Number(b.total_amount || 0), 0);
    const abv = periodBks.length ? revenueMTD / periodBks.length : 0;

    const upcomingRevenue30 = (upcoming.data ?? []).reduce(
      (s: number, b: any) => s + Number(b.total_amount || 0),
      0,
    );

    const pendingAmount = (pendingPayments.data ?? []).reduce(
      (s: number, b: any) => s + Number(b.total_amount || 0),
      0,
    );

    let usedDays = 0;
    for (const b of utilRows.data ?? []) {
      usedDays += overlapDays(b.date_from, b.date_to, rFrom, rTo);
    }
    const utilizationMTD = totalCars
      ? Math.round((usedDays / (totalCars * rDays)) * 100)
      : 0;

    return {
      kpis: {
        revenueMTD,
        utilizationMTD,
        freeToday,
        totalCars,
        upcomingRevenue30,
        pendingAmount,
        pendingCount: pendingPayments.data?.length ?? 0,
        abv,
        newReservations24h: newest.data?.length ?? 0,
      },
      today: {
        pickups: todayPickups.data ?? [],
        returns: todayReturns.data ?? [],
        pending: pendingPayments.data ?? [],
      },
      newest: newest.data ?? [],
    };
  });

// === Fleet tab ===
export const getFleetStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => periodInput.parse(d))
  .handler(async ({ context, data }) => {
    await ensureAdmin(context);
    const { from: rFrom, to: rTo, days: rDays } = resolveRange(data);
    const today = todayISO();

    const [carsR, bookingsR, maintR] = await Promise.all([
      context.supabase
        .from("cars")
        .select("id, name, category, is_active, price_per_day, cover_image_url")
        .order("sort_order", { ascending: true }),
      context.supabase
        .from("bookings")
        .select("car_id, date_from, date_to, total_amount, status")
        .in("status", REVENUE_STATUSES as unknown as string[])
        .lt("date_from", rTo)
        .gt("date_to", rFrom),

      context.supabase.from("car_maintenance").select("*"),
    ]);

    if (carsR.error) throw new Error(carsR.error.message);

    const cars = carsR.data ?? [];
    const bookings = (bookingsR.data ?? []) as any[];
    const maint = (maintR.data ?? []) as any[];

    const fleet = cars.map((car: any) => {
      const carBookings = bookings.filter((b) => b.car_id === car.id);
      let days = 0;
      let revenue = 0;
      for (const b of carBookings) {
        const d = overlapDays(b.date_from, b.date_to, rFrom, rTo);
        days += d;
        const totalNights = bookingNights(b.date_from, b.date_to);
        revenue += (Number(b.total_amount || 0) * d) / totalNights;
      }
      const utilization = Math.round((days / rDays) * 100);
      const adr = days ? Math.round(revenue / days) : 0;
      const isBusyToday = carBookings.some(
        (b) =>
          b.status !== "cancelled" && b.date_from <= today && b.date_to > today,
      );


      const carMaint = maint.filter((m) => m.car_id === car.id);
      return {
        id: car.id,
        name: car.name,
        category: car.category,
        isActive: car.is_active,
        pricePerDay: Number(car.price_per_day),
        cover: car.cover_image_url,
        utilization,
        revenue: Math.round(revenue),
        adr,
        bookingsCount: carBookings.length,
        isBusyToday,
        maintenance: carMaint.map((m) => ({
          type: m.type,
          dueDate: m.due_date,
          dueMileageKm: m.due_mileage_km,
          lastDoneAt: m.last_done_at,
          note: m.note,
        })),
      };
    });

    return { fleet, daysInMonth: rDays };
  });

// === Business tab ===
export const getBusinessAnalytics = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => periodInput.parse(d))
  .handler(async ({ context, data }) => {
    await ensureAdmin(context);
    const today = new Date();
    const { from: rFrom, to: rTo, days: rDays } = resolveRange(data);
    const sinceISO = new Date(rFrom + "T00:00:00Z").toISOString();
    const untilISO = new Date(rTo + "T00:00:00Z").toISOString();


    const [views, bookings, allBookings, investments, expenses] = await Promise.all([
      context.supabase
        .from("page_views")
        .select("session_id, path, created_at")
        .gte("created_at", sinceISO)
        .lt("created_at", untilISO),
      context.supabase
        .from("bookings")
        .select("id, total_amount, date_from, date_to, status, source, customer_name, customer_phone, cars(name)")
        .gte("created_at", sinceISO)
        .lt("created_at", untilISO),
      context.supabase
        .from("bookings")
        .select("total_amount, date_from, date_to, status, source, customer_name, customer_phone, cars(name)")
        .in("status", REVENUE_STATUSES as unknown as string[])
        .gte("date_from", rFrom)
        .lt("date_from", rTo),

      context.supabase.from("car_investments").select("amount"),
      context.supabase.from("expenses").select("amount, expense_date"),
    ]);

    const viewsData = (views.data ?? []) as any[];
    const uniqueVisitors = new Set(viewsData.map((v) => v.session_id)).size;
    const totalViews = viewsData.length;

    const bks = (bookings.data ?? []) as any[];
    const totalBookings = bks.length;
    const confirmed = bks.filter((b) =>
      (REVENUE_STATUSES as readonly string[]).includes(b.status),
    ).length;
    const conversion = uniqueVisitors ? (confirmed / uniqueVisitors) * 100 : 0;

    const all = (allBookings.data ?? []) as any[];
    const avgDuration = all.length
      ? all.reduce((s, b) => s + bookingNights(b.date_from, b.date_to), 0) / all.length
      : 0;
    const avgAmount = all.length
      ? all.reduce((s, b) => s + Number(b.total_amount || 0), 0) / all.length
      : 0;

    // Upcoming 3 months — visada nuo dabar, nepriklauso nuo filtro
    const upcoming: { month: string; label: string; amount: number; count: number }[] = [];
    const { data: upcomingRows } = await context.supabase
      .from("bookings")
      .select("total_amount, date_from, status")
      .in("status", CONFIRMED_STATUSES as unknown as string[])
      .gte("date_from", todayISO());
    const upRows = (upcomingRows ?? []) as any[];
    for (let i = 0; i < 3; i++) {
      const d = new Date(today.getFullYear(), today.getMonth() + i, 1);
      const mS = d.toISOString().slice(0, 10);
      const mE = new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().slice(0, 10);
      const inMonth = upRows.filter(
        (b: any) => b.date_from >= mS && b.date_from <= mE,
      );
      upcoming.push({
        month: mS,
        label: d.toLocaleDateString("lt-LT", { month: "long", year: "numeric" }),
        amount: inMonth.reduce((s: number, b: any) => s + Number(b.total_amount || 0), 0),
        count: inMonth.length,
      });
    }

    const carMap = new Map<string, number>();
    const customerMap = new Map<string, { name: string; phone: string; amount: number; count: number }>();
    const sourceMap = new Map<string, number>();
    for (const b of all) {
      const carName = b.cars?.name ?? "—";
      carMap.set(carName, (carMap.get(carName) ?? 0) + Number(b.total_amount || 0));
      const key = b.customer_phone || b.customer_name;
      const cur = customerMap.get(key) ?? { name: b.customer_name, phone: b.customer_phone, amount: 0, count: 0 };
      cur.amount += Number(b.total_amount || 0);
      cur.count += 1;
      customerMap.set(key, cur);
      sourceMap.set(b.source ?? "other", (sourceMap.get(b.source ?? "other") ?? 0) + 1);
    }
    const topCars = [...carMap.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, amount]) => ({ name, amount }));
    const topCustomers = [...customerMap.values()].sort((a, b) => b.amount - a.amount).slice(0, 5);
    const sources = [...sourceMap.entries()].map(([source, count]) => ({ source, count }));

    // Money — period scoped
    const monthRevenue = all.reduce((s, b) => s + Number(b.total_amount || 0), 0);
    const monthExpenses = (expenses.data ?? [])
      .filter((e: any) => e.expense_date >= rFrom && e.expense_date < rTo)
      .reduce((s: number, e: any) => s + Number(e.amount || 0), 0);

    const totalInvestment = (investments.data ?? []).reduce(
      (s: number, i: any) => s + Number(i.amount || 0),
      0,
    );
    const monthProfit = monthRevenue - monthExpenses;
    const annualROI = totalInvestment
      ? (((monthProfit / rDays) * 365) / totalInvestment) * 100
      : 0;

    // Cashflow 12 mėn. — visada paskutiniai 12 mėnesių, nepriklauso nuo filtro
    const cashflow: { month: string; revenue: number; expenses: number; profit: number }[] = [];
    const cashStart = new Date(today.getFullYear(), today.getMonth() - 11, 1).toISOString().slice(0, 10);
    const cashEnd = monthEnd(today);
    const [cashBks, cashExp] = await Promise.all([
      context.supabase
        .from("bookings")
        .select("total_amount, date_from, status")
        .in("status", REVENUE_STATUSES as unknown as string[])
        .gte("date_from", cashStart)
        .lte("date_from", cashEnd),
      context.supabase
        .from("expenses")
        .select("amount, expense_date")
        .gte("expense_date", cashStart)
        .lte("expense_date", cashEnd),
    ]);
    const cashBksData = (cashBks.data ?? []) as any[];
    const cashExpData = (cashExp.data ?? []) as any[];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const mS = d.toISOString().slice(0, 10);
      const mE = new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().slice(0, 10);
      const rev = cashBksData
        .filter((b: any) => b.date_from >= mS && b.date_from <= mE)
        .reduce((s: number, b: any) => s + Number(b.total_amount || 0), 0);
      const exp = cashExpData
        .filter((e: any) => e.expense_date >= mS && e.expense_date <= mE)
        .reduce((s: number, e: any) => s + Number(e.amount || 0), 0);
      cashflow.push({
        month: d.toLocaleDateString("lt-LT", { month: "short" }),
        revenue: Math.round(rev),
        expenses: Math.round(exp),
        profit: Math.round(rev - exp),
      });
    }

    return {
      funnel: {
        visitors: uniqueVisitors,
        views: totalViews,
        bookings: totalBookings,
        confirmed,
        conversion,
      },
      averages: {
        duration: avgDuration,
        amount: avgAmount,
      },
      upcoming,
      topCars,
      topCustomers,
      sources,
      money: {
        totalInvestment,
        monthRevenue,
        monthExpenses,
        monthProfit,
        annualROI,
        cashflow,
      },
      sinceDate: rFrom,
    };
  });
