import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

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

function nights(from: string, to: string) {
  const a = new Date(from + "T00:00:00Z").getTime();
  const b = new Date(to + "T00:00:00Z").getTime();
  return Math.max(1, Math.round((b - a) / 86400000));
}

function overlapNights(from: string, to: string, rFrom: string, rTo: string) {
  const af = new Date(from + "T00:00:00Z").getTime();
  const at = new Date(to + "T00:00:00Z").getTime();
  const rf = new Date(rFrom + "T00:00:00Z").getTime();
  const rt = new Date(rTo + "T00:00:00Z").getTime();
  return Math.max(0, Math.round((Math.min(at, rt) - Math.max(af, rf)) / 86400000));
}

function monthKey(d: Date) {
  return d.toISOString().slice(0, 7);
}

// ===== Vehicle Overview =====
export const getVehicleOverview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ carId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await ensureAdmin(context);
    const { carId } = data;
    const today = todayISO();

    const [carR, bookingsR, expR, invR, maintR, serviceR, docsR] = await Promise.all([
      context.supabase.from("cars").select("*").eq("id", carId).maybeSingle(),
      context.supabase
        .from("bookings")
        .select("id, booking_number, customer_name, customer_phone, date_from, date_to, pickup_time, return_time, total_amount, status, mileage_in, mileage_out")
        .eq("car_id", carId)
        .order("date_from", { ascending: false }),
      context.supabase
        .from("expenses")
        .select("id, category, amount, expense_date, note, mileage_km")
        .eq("car_id", carId)
        .order("expense_date", { ascending: false }),
      context.supabase
        .from("car_investments")
        .select("id, category, amount, purchase_date, note, mileage_km")
        .eq("car_id", carId)
        .order("purchase_date", { ascending: false }),
      context.supabase.from("car_maintenance").select("*").eq("car_id", carId),
      context.supabase
        .from("car_service_events")
        .select("*")
        .eq("car_id", carId)
        .order("started_at", { ascending: false }),
      context.supabase
        .from("car_documents")
        .select("*")
        .eq("car_id", carId)
        .order("created_at", { ascending: false }),
    ]);

    if (carR.error) throw new Error(carR.error.message);
    if (!carR.data) throw new Error("Not found");

    const car = carR.data;
    const bookings = (bookingsR.data ?? []) as any[];
    const expenses = (expR.data ?? []) as any[];
    const investments = (invR.data ?? []) as any[];
    const maintenance = (maintR.data ?? []) as any[];
    const serviceEvents = (serviceR.data ?? []) as any[];
    const documents = (docsR.data ?? []) as any[];

    // Signed URLs for docs
    const docsWithUrls = await Promise.all(
      documents.map(async (d) => {
        const { data: signed } = await context.supabase.storage
          .from("car-documents")
          .createSignedUrl(d.file_path, 60 * 60);
        return { ...d, url: signed?.signedUrl ?? null };
      }),
    );

    const revenueBookings = bookings.filter((b) =>
      (REVENUE_STATUSES as readonly string[]).includes(b.status),
    );

    // Totals
    const totalRevenue = revenueBookings.reduce((s, b) => s + Number(b.total_amount || 0), 0);
    const totalExpenses = expenses.reduce((s, e) => s + Number(e.amount || 0), 0);
    const totalInvestment = investments.reduce((s, i) => s + Number(i.amount || 0), 0);
    const profit = totalRevenue - totalExpenses;
    const roi = totalInvestment > 0 ? (profit / totalInvestment) * 100 : null;

    const occupiedDays = revenueBookings.reduce(
      (s, b) => s + nights(b.date_from, b.date_to),
      0,
    );

    // Utilization based on earliest data point: purchase_date or first booking
    const earliestInv = investments.reduce<string | null>((acc, i) => {
      if (!acc || i.purchase_date < acc) return i.purchase_date;
      return acc;
    }, null);
    const earliestBk = bookings.reduce<string | null>((acc, b) => {
      if (!acc || b.date_from < acc) return b.date_from;
      return acc;
    }, null);
    const startedAt = earliestInv ?? earliestBk ?? car.created_at?.slice(0, 10) ?? today;
    const daysOwned = Math.max(
      1,
      Math.round(
        (new Date(today + "T00:00:00Z").getTime() -
          new Date(startedAt + "T00:00:00Z").getTime()) /
          86400000,
      ),
    );
    const utilization = Math.round((occupiedDays / daysOwned) * 100);
    const adr = occupiedDays > 0 ? totalRevenue / occupiedDays : null;
    const avgDuration =
      revenueBookings.length > 0 ? occupiedDays / revenueBookings.length : null;

    // Payback (months): investment / avg monthly profit
    const monthsOwned = Math.max(1, daysOwned / 30.4375);
    const monthlyProfit = profit / monthsOwned;
    const payback =
      monthlyProfit > 0 && totalInvestment > 0
        ? totalInvestment / monthlyProfit
        : null;

    // Status
    const todayBusy = bookings.some(
      (b) => b.status !== "cancelled" && b.date_from <= today && b.date_to > today,
    );
    const isInService = car.service_status === "in_service";
    const status: "in_service" | "busy" | "free" = isInService
      ? "in_service"
      : todayBusy
        ? "busy"
        : "free";

    // Today details
    const todayPickup = bookings.find((b) => b.date_from === today && b.status !== "cancelled");
    const todayReturn = bookings.find((b) => b.date_to === today && b.status !== "cancelled");

    // Next upcoming
    const upcomingBk = bookings
      .filter((b) => b.status !== "cancelled" && b.date_from > today)
      .sort((a, b) => a.date_from.localeCompare(b.date_from))[0];

    // Finance serija: nuo mėn., kada automobilis pradėjo dirbti, bet ne daugiau nei 12 mėn.
    const LT_MONTH_SHORT = ["Sau", "Vas", "Kov", "Bal", "Geg", "Bir", "Lie", "Rugp", "Rgs", "Spa", "Lap", "Gru"];
    const months: { key: string; label: string }[] = [];
    const now = new Date();
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const maxBack = new Date(now.getFullYear(), now.getMonth() - 11, 1);
    let seriesStart = maxBack;
    if (startedAt) {
      const [sy, sm] = startedAt.split("-").map(Number);
      const startedMonth = new Date(sy, (sm || 1) - 1, 1);
      if (startedMonth > seriesStart) seriesStart = startedMonth;
      if (seriesStart > currentMonthStart) seriesStart = currentMonthStart;
    }
    const cursor = new Date(seriesStart);
    while (cursor <= currentMonthStart) {
      months.push({ key: monthKey(cursor), label: LT_MONTH_SHORT[cursor.getMonth()] });
      cursor.setMonth(cursor.getMonth() + 1);
    }
    const monthly = months.map(({ key, label }) => {
      const start = key + "-01";
      const [y, m] = key.split("-").map(Number);
      const endDate = new Date(y, m, 1).toISOString().slice(0, 10); // exclusive
      const rev = revenueBookings
        .filter((b) => b.date_from >= start && b.date_from < endDate)
        .reduce((s, b) => s + Number(b.total_amount || 0), 0);
      const exp = expenses
        .filter((e) => e.expense_date >= start && e.expense_date < endDate)
        .reduce((s, e) => s + Number(e.amount || 0), 0);
      let occ = 0;
      for (const b of revenueBookings) {
        occ += overlapNights(b.date_from, b.date_to, start, endDate);
      }
      const daysInMonth = nights(start, endDate);
      const util = Math.round((occ / daysInMonth) * 100);
      const bkCount = revenueBookings.filter(
        (b) => b.date_from >= start && b.date_from < endDate,
      ).length;
      const kmDriven = revenueBookings
        .filter((b) => b.date_to >= start && b.date_to < endDate)
        .reduce((s, b) => {
          const out = Number(b.mileage_out || 0);
          const inn = Number(b.mileage_in || 0);
          return s + (inn > out ? inn - out : 0);
        }, 0);
      return {
        month: label,
        revenue: Math.round(rev),
        expenses: Math.round(exp),
        profit: Math.round(rev - exp),
        utilization: util,
        occupiedDays: occ,
        daysInMonth,
        bookings: bkCount,
        km: kmDriven,
        roi: totalInvestment > 0 ? Math.round(((rev - exp) / totalInvestment) * 100) : 0,
      };
    });

    // Booking stats
    const amounts = revenueBookings.map((b) => Number(b.total_amount || 0));
    const durations = revenueBookings.map((b) => nights(b.date_from, b.date_to));
    const bookingStats = {
      total: revenueBookings.reduce((s, a) => s + a, totalRevenue * 0), // placeholder
      avg: amounts.length ? amounts.reduce((s, a) => s + a, 0) / amounts.length : 0,
      longest: durations.length ? Math.max(...durations) : 0,
      shortest: durations.length ? Math.min(...durations) : 0,
      sum: totalRevenue,
      count: revenueBookings.length,
    };

    return {
      car: {
        id: car.id,
        name: car.name,
        year: car.year,
        category: car.category,
        cover: car.cover_image_url,
        currentMileage: car.current_mileage,
        serviceStatus: car.service_status as "active" | "in_service",
        pricePerDay: Number(car.price_per_day),
        isActive: car.is_active,
      },
      status,
      today: {
        pickup: todayPickup
          ? {
              id: todayPickup.id,
              customer: todayPickup.customer_name,
              time: todayPickup.pickup_time,
            }
          : null,
        return: todayReturn
          ? {
              id: todayReturn.id,
              customer: todayReturn.customer_name,
              time: todayReturn.return_time,
            }
          : null,
      },
      upcoming: upcomingBk
        ? {
            id: upcomingBk.id,
            customer: upcomingBk.customer_name,
            date_from: upcomingBk.date_from,
            date_to: upcomingBk.date_to,
          }
        : null,
      kpis: {
        totalInvestment,
        totalRevenue,
        totalExpenses,
        profit,
        roi,
        utilization,
        adr,
        revPerOccDay: adr,
        avgDuration,
        payback,
        occupiedDays,
        daysOwned,
      },
      bookings: revenueBookings.map((b) => ({
        id: b.id,
        number: b.booking_number,
        customer: b.customer_name,
        phone: b.customer_phone,
        date_from: b.date_from,
        date_to: b.date_to,
        nights: nights(b.date_from, b.date_to),
        total_amount: Number(b.total_amount || 0),
        status: b.status,
      })),
      bookingStats,
      investments,
      expenses,
      maintenance: maintenance.map((m) => ({
        type: m.type,
        dueDate: m.due_date,
        dueMileageKm: m.due_mileage_km,
        lastDoneAt: m.last_done_at,
        note: m.note,
      })),
      serviceEvents,
      documents: docsWithUrls,
      monthly,
    };
  });

// ===== Documents =====
export const uploadCarDocument = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        car_id: z.string().uuid(),
        kind: z.enum(["registration", "insurance", "inspection", "purchase", "other"]),
        title: z.string().trim().max(200).default(""),
        expires_at: z.string().nullable().optional(),
        filename: z.string().trim().min(1).max(200),
        mime_type: z.string().trim().min(1).max(100),
        base64: z.string().min(1),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await ensureAdmin(context);
    const safe = data.filename.replace(/[^a-zA-Z0-9._-]/g, "_");
    const path = `${data.car_id}/${Date.now()}_${safe}`;
    const bytes = Uint8Array.from(atob(data.base64), (c) => c.charCodeAt(0));

    const { error: upErr } = await context.supabase.storage
      .from("car-documents")
      .upload(path, bytes, { contentType: data.mime_type, upsert: false });
    if (upErr) throw new Error(upErr.message);

    const { error } = await context.supabase.from("car_documents").insert({
      car_id: data.car_id,
      kind: data.kind,
      title: data.title || data.filename,
      file_path: path,
      mime_type: data.mime_type,
      size_bytes: bytes.length,
      expires_at: data.expires_at || null,
      uploaded_by: context.userId,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteCarDocument = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await ensureAdmin(context);
    const { data: row, error: rErr } = await context.supabase
      .from("car_documents")
      .select("file_path")
      .eq("id", data.id)
      .maybeSingle();
    if (rErr) throw new Error(rErr.message);
    if (row?.file_path) {
      await context.supabase.storage.from("car-documents").remove([row.file_path]);
    }
    const { error } = await context.supabase.from("car_documents").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ===== Service actions =====
export const startService = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        car_id: z.string().uuid(),
        reason: z.string().trim().max(500).default(""),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await ensureAdmin(context);
    // Close any open events first (defensive)
    await context.supabase
      .from("car_service_events")
      .update({ ended_at: new Date().toISOString() })
      .eq("car_id", data.car_id)
      .is("ended_at", null);

    const { error: insErr } = await context.supabase.from("car_service_events").insert({
      car_id: data.car_id,
      reason: data.reason,
    });
    if (insErr) throw new Error(insErr.message);

    const { error: upErr } = await context.supabase
      .from("cars")
      .update({ service_status: "in_service" })
      .eq("id", data.car_id);
    if (upErr) throw new Error(upErr.message);
    return { ok: true };
  });

export const endService = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        car_id: z.string().uuid(),
        cost: z.number().min(0).max(10000000).nullable().optional(),
        mileage_km: z.number().int().min(0).max(9999999).nullable().optional(),
        note: z.string().trim().max(2000).default(""),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await ensureAdmin(context);
    const { data: open, error: fErr } = await context.supabase
      .from("car_service_events")
      .select("id, reason")
      .eq("car_id", data.car_id)
      .is("ended_at", null)
      .order("started_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (fErr) throw new Error(fErr.message);

    if (open) {
      const { error: uErr } = await context.supabase
        .from("car_service_events")
        .update({
          ended_at: new Date().toISOString(),
          cost: data.cost ?? null,
          mileage_km: data.mileage_km ?? null,
          note: data.note,
        })
        .eq("id", open.id);
      if (uErr) throw new Error(uErr.message);
    }

    // Record expense
    if (data.cost && data.cost > 0) {
      await context.supabase.from("expenses").insert({
        car_id: data.car_id,
        category: "maintenance",
        amount: data.cost,
        expense_date: new Date().toISOString().slice(0, 10),
        mileage_km: data.mileage_km ?? null,
        note: `Servisas: ${open?.reason || ""} ${data.note}`.trim(),
      });
    }

    // Bump mileage if provided & larger
    if (data.mileage_km && data.mileage_km > 0) {
      const { data: car } = await context.supabase
        .from("cars")
        .select("current_mileage")
        .eq("id", data.car_id)
        .maybeSingle();
      if (car && data.mileage_km > (car.current_mileage ?? 0)) {
        await context.supabase
          .from("cars")
          .update({ current_mileage: data.mileage_km })
          .eq("id", data.car_id);
      }
    }

    const { error: sErr } = await context.supabase
      .from("cars")
      .update({ service_status: "active" })
      .eq("id", data.car_id);
    if (sErr) throw new Error(sErr.message);
    return { ok: true };
  });

export const setCurrentMileage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        car_id: z.string().uuid(),
        mileage: z.number().int().min(0).max(9999999),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await ensureAdmin(context);
    const { data: car } = await context.supabase
      .from("cars")
      .select("current_mileage")
      .eq("id", data.car_id)
      .maybeSingle();
    if (!car) throw new Error("Not found");
    if (data.mileage < (car.current_mileage ?? 0)) {
      throw new Error("Rida negali mažėti");
    }
    const { error } = await context.supabase
      .from("cars")
      .update({ current_mileage: data.mileage })
      .eq("id", data.car_id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
