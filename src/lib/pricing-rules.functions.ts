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
    message: "Nurodykite arba daugiklį, arba tikslią kainą (tik vieną).",
  })
  .refine((v) => v.date_to >= v.date_from, { message: "Pabaigos data negali būti ankstesnė už pradžios." });

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
      .refine((v) => v.tiers.every((t, i) => i === 0 || t.minOccupancyPct > v.tiers[i - 1].minOccupancyPct), {
        message: "Užimtumo ribos turi didėti ir nesikartoti.",
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
