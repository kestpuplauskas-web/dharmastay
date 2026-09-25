import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  computeQuote,
  occupancyForDate,
  stayNightDates,
  type OccupancyTier,
  type RateCalendarRow,
} from "@/lib/booking-pricing";

const ensureAdmin = async (ctx: { supabase: any; userId: string }) => {
  const { data, error } = await ctx.supabase.rpc("has_role", { _user_id: ctx.userId, _role: "admin" });
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Neturite administratoriaus teisių.");
};

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Neteisinga data");

export const listRateCalendar = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ property_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await ensureAdmin(context);
    const { data: rows, error } = await context.supabase
      .from("property_rate_calendar")
      .select("*")
      .eq("property_id", data.property_id)
      .order("date_from", { ascending: true });
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

const rowInput = z
  .object({
    id: z.string().uuid().optional(),
    property_id: z.string().uuid(),
    date_from: isoDate,
    date_to: isoDate,
    kind: z.enum(["season", "event", "manual"]),
    label: z.string().trim().min(1, "Įveskite pavadinimą").max(100),
    multiplier: z.number().positive().max(10).nullable(),
    fixed_price: z.number().min(0).max(100000).nullable(),
    priority: z.number().int().min(-100).max(100).default(0),
  })
  .refine((v) => (v.multiplier == null) !== (v.fixed_price == null), {
    message: "Pasirinkite arba procentinį pakeitimą, arba tikslią kainą — ne abu.",
  })
  .refine((v) => v.date_to >= v.date_from, { message: "Pabaigos data negali būti ankstesnė už pradžios datą." });

export const saveRateCalendarRow = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => rowInput.parse(d))
  .handler(async ({ data, context }) => {
    await ensureAdmin(context);
    const { id, ...rest } = data;
    const q = id
      ? context.supabase.from("property_rate_calendar").update(rest).eq("id", id)
      : context.supabase.from("property_rate_calendar").insert({ ...rest, created_by: context.userId });
    const { data: row, error } = await q.select("*").single();
    if (error) throw new Error(error.message);
    return row;
  });

export const deleteRateCalendarRow = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await ensureAdmin(context);
    const { error } = await context.supabase.from("property_rate_calendar").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

const tierSchema = z.object({ minOccupancyPct: z.number().min(0).max(100), multiplier: z.number().positive().max(10) });

export const saveOccupancyPricing = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        property_id: z.string().uuid(),
        tiers: z.array(tierSchema).max(20),
        min_nightly_rate: z.number().min(0).nullable(),
        max_nightly_rate: z.number().min(0).nullable(),
        dynamic_pricing_enabled: z.boolean(),
      })
      .superRefine((v, ctx) => {
        for (let i = 1; i < v.tiers.length; i++) {
          if (v.tiers[i].minOccupancyPct <= v.tiers[i - 1].minOccupancyPct) {
            ctx.addIssue({
              code: "custom",
              message: `Užimtumo ribos turi didėti iš eilės — riba ${v.tiers[i].minOccupancyPct} % pakartota arba mažesnė už ankstesnę.`,
            });
            return;
          }
        }
      })
      .refine((v) => v.min_nightly_rate == null || v.max_nightly_rate == null || v.max_nightly_rate >= v.min_nightly_rate, {
        message: "Maksimali kaina negali būti mažesnė už minimalią.",
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await ensureAdmin(context);
    const { error } = await context.supabase
      .from("properties")
      .update({
        occupancy_pricing: data.tiers,
        min_nightly_rate: data.min_nightly_rate,
        max_nightly_rate: data.max_nightly_rate,
        dynamic_pricing_enabled: data.dynamic_pricing_enabled,
      })
      .eq("id", data.property_id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const previewDynamicPrice = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({ property_id: z.string().uuid(), date_from: isoDate, date_to: isoDate }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await ensureAdmin(context);
    const sb = context.supabase;
    const [{ data: prop, error: pErr }, { data: cal, error: cErr }, { data: active, error: aErr }, { data: bks, error: bErr }] =
      await Promise.all([
        sb.from("properties")
          .select("price_per_night, price_tiers, dynamic_pricing_enabled, min_nightly_rate, max_nightly_rate, occupancy_pricing")
          .eq("id", data.property_id)
          .single(),
        sb.from("property_rate_calendar").select("*").eq("property_id", data.property_id)
          .lte("date_from", data.date_to).gte("date_to", data.date_from),
        sb.from("properties").select("id").eq("is_active", true),
        sb.from("bookings").select("property_id, date_from, date_to, status")
          .lt("date_from", data.date_to).gt("date_to", data.date_from).neq("status", "cancelled"),
      ]);
    const err = pErr ?? cErr ?? aErr ?? bErr;
    if (err) throw new Error(err.message);
    if (!prop) throw new Error("Objektas nerastas.");
    const ids = (active ?? []).map((r: { id: string }) => r.id);
    const occupancyByDate: Record<string, number> = {};
    for (const d of stayNightDates(data.date_from, data.date_to)) {
      occupancyByDate[d] = occupancyForDate(d, ids, bks ?? []);
    }
    const q = computeQuote({
      pricePerNight: Number(prop.price_per_night),
      priceTiers: (prop.price_tiers as any) ?? [],
      extraServices: [],
      dateFrom: data.date_from,
      dateTo: data.date_to,
      adults: 1,
      children: 0,
      infants: 0,
      selectedExtras: [],
      dynamicPricing: {
        enabled: Boolean(prop.dynamic_pricing_enabled),
        rateCalendar: (cal ?? []) as RateCalendarRow[],
        occupancyTiers: (prop.occupancy_pricing as unknown as OccupancyTier[]) ?? [],
        minNightlyRate: prop.min_nightly_rate != null ? Number(prop.min_nightly_rate) : null,
        maxNightlyRate: prop.max_nightly_rate != null ? Number(prop.max_nightly_rate) : null,
        occupancyByDate,
      },
    });
    return { ...q, occupancyByDate };
  });

/** Admin rezervacijos formai: dinaminės kainodaros duomenys pasirinktiems objektams. */
export const getDynamicPricingInputs = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({ property_ids: z.array(z.string().uuid()).max(50), date_from: isoDate, date_to: isoDate })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await ensureAdmin(context);
    const { loadDynamicPricingMap } = await import("@/lib/dynamic-pricing.server");
    return loadDynamicPricingMap(data.property_ids, data.date_from, data.date_to);
  });

/** Objekto dinaminės kainodaros nustatymai (jungiklis, ribos, užimtumo pakopos). */
export const getPricingSettings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ property_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await ensureAdmin(context);
    const { data: row, error } = await context.supabase
      .from("properties")
      .select("dynamic_pricing_enabled, min_nightly_rate, max_nightly_rate, occupancy_pricing, price_per_night")
      .eq("id", data.property_id)
      .single();
    if (error) throw new Error(error.message);
    return {
      enabled: Boolean(row.dynamic_pricing_enabled),
      min: row.min_nightly_rate != null ? Number(row.min_nightly_rate) : null,
      max: row.max_nightly_rate != null ? Number(row.max_nightly_rate) : null,
      tiers: ((row.occupancy_pricing as unknown as OccupancyTier[]) ?? []),
      base: Number(row.price_per_night),
    };
  });

/* ───────────── Centrinis kainodaros ekranas (/admin/pricing) ───────────── */

/** Visų objektų kainodaros suvestinė. */
export const listPricingOverview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await ensureAdmin(context);
    const { data, error } = await context.supabase
      .from("properties")
      .select(
        "id, name, is_active, price_per_night, dynamic_pricing_enabled, min_nightly_rate, max_nightly_rate, occupancy_pricing",
      )
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true });
    if (error) throw new Error(error.message);
    return (data ?? []).map((p) => ({
      id: p.id as string,
      name: p.name as string,
      is_active: Boolean(p.is_active),
      base: Number(p.price_per_night),
      enabled: Boolean(p.dynamic_pricing_enabled),
      min: p.min_nightly_rate != null ? Number(p.min_nightly_rate) : null,
      max: p.max_nightly_rate != null ? Number(p.max_nightly_rate) : null,
      tiers: (p.occupancy_pricing as unknown as OccupancyTier[]) ?? [],
    }));
  });

/** Kainų taisyklės vienam arba visiems objektams. */
export const listRateCalendarMulti = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ property_id: z.string().uuid().nullable() }).parse(d))
  .handler(async ({ data, context }) => {
    await ensureAdmin(context);
    let q = context.supabase
      .from("property_rate_calendar")
      .select("*")
      .order("date_from", { ascending: true });
    if (data.property_id) q = q.eq("property_id", data.property_id);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

/** Šilumos žemėlapis: kiekvienos dienos kaina pasirinktam objektui arba vidurkis visiems. */
export const getPricingHeatmap = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({ property_id: z.string().uuid().nullable(), date_from: isoDate, date_to: isoDate }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await ensureAdmin(context);
    const sb = context.supabase;
    let propQ = sb
      .from("properties")
      .select(
        "id, price_per_night, dynamic_pricing_enabled, min_nightly_rate, max_nightly_rate, occupancy_pricing",
      )
      .eq("is_active", true);
    if (data.property_id) propQ = propQ.eq("id", data.property_id);

    const [{ data: props, error: pErr }, { data: cal, error: cErr }, { data: bks, error: bErr }] =
      await Promise.all([
        propQ,
        sb
          .from("property_rate_calendar")
          .select("property_id, date_from, date_to, kind, multiplier, fixed_price, priority, created_at")
          .lte("date_from", data.date_to)
          .gte("date_to", data.date_from),
        sb
          .from("bookings")
          .select("property_id, date_from, date_to, status")
          .lt("date_from", data.date_to)
          .gt("date_to", data.date_from)
          .neq("status", "cancelled"),
      ]);
    const err = pErr ?? cErr ?? bErr;
    if (err) throw new Error(err.message);

    const list = props ?? [];
    const activeIds = list.map((p: { id: string }) => p.id);
    const dates = stayNightDates(data.date_from, data.date_to);
    const days = dates.map((date) => {
      const occupancy = occupancyForDate(date, activeIds, bks ?? []);
      let sumBase = 0;
      let sumPrice = 0;
      let source: string = "base";
      for (const p of list as any[]) {
        const base = Number(p.price_per_night) || 0;
        const rows = ((cal ?? []) as any[]).filter((r) => r.property_id === p.id) as RateCalendarRow[];
        const n = priceForNight(base, date, {
          enabled: Boolean(p.dynamic_pricing_enabled),
          rateCalendar: rows,
          occupancyTiers: (p.occupancy_pricing as unknown as OccupancyTier[]) ?? [],
          minNightlyRate: p.min_nightly_rate != null ? Number(p.min_nightly_rate) : null,
          maxNightlyRate: p.max_nightly_rate != null ? Number(p.max_nightly_rate) : null,
          occupancyByDate: { [date]: occupancy },
        });
        sumBase += base;
        sumPrice += n.price;
        if (n.source !== "base") source = n.source;
      }
      const count = list.length || 1;
      const base = Math.round((sumBase / count) * 100) / 100;
      const price = Math.round((sumPrice / count) * 100) / 100;
      return {
        date,
        base,
        price,
        source,
        occupancy: Math.round(occupancy),
        ratio: base > 0 ? price / base : 1,
      };
    });
    return { days };
  });

/** Viena taisyklė iš karto keliems objektams. */
export const saveRateCalendarBulk = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        property_ids: z.array(z.string().uuid()).min(1, "Pasirinkite bent vieną objektą.").max(200),
        date_from: isoDate,
        date_to: isoDate,
        kind: z.enum(["season", "event", "manual"]),
        label: z.string().trim().min(1, "Įveskite pavadinimą").max(100),
        multiplier: z.number().positive().max(10).nullable(),
        fixed_price: z.number().min(0).max(100000).nullable(),
        priority: z.number().int().min(-100).max(100).default(0),
      })
      .refine((v) => (v.multiplier == null) !== (v.fixed_price == null), {
        message: "Pasirinkite arba procentinį pakeitimą, arba tikslią kainą — ne abu.",
      })
      .refine((v) => v.date_to >= v.date_from, {
        message: "Pabaigos data negali būti ankstesnė už pradžios datą.",
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await ensureAdmin(context);
    const { property_ids, ...rest } = data;
    const rows = property_ids.map((property_id) => ({ ...rest, property_id, created_by: context.userId }));
    const { error } = await context.supabase.from("property_rate_calendar").insert(rows);
    if (error) throw new Error(error.message);
    return { ok: true, count: rows.length };
  });

/** Dinaminės kainodaros jungiklis keliems objektams iš karto. */
export const bulkSetDynamicPricing = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({ property_ids: z.array(z.string().uuid()).min(1).max(200), enabled: z.boolean() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await ensureAdmin(context);
    const { error } = await context.supabase
      .from("properties")
      .update({ dynamic_pricing_enabled: data.enabled })
      .in("id", data.property_ids);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
