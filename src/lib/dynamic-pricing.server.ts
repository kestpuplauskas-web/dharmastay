/** Surenka dinaminės kainodaros duomenis computeQuote funkcijai (tik serveryje). */
import {
  occupancyForDate,
  stayNightDates,
  type DynamicPricingInput,
  type OccupancyTier,
  type RateCalendarRow,
} from "./booking-pricing";

/**
 * Grąžina DynamicPricingInput kiekvienam objektui (tik tiems, kuriems įjungta).
 * Naudojamas ir viešame API, ir admin formoje — vienas duomenų kelias.
 */
export async function loadDynamicPricingMap(
  propertyIds: string[],
  dateFrom: string,
  dateTo: string,
): Promise<Record<string, DynamicPricingInput>> {
  const out: Record<string, DynamicPricingInput> = {};
  if (!propertyIds.length || !(dateTo > dateFrom)) return out;
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: props, error } = await supabaseAdmin
    .from("properties")
    .select("id, dynamic_pricing_enabled, min_nightly_rate, max_nightly_rate, occupancy_pricing")
    .in("id", propertyIds)
    .eq("dynamic_pricing_enabled", true);
  if (error) throw new Error(error.message);
  if (!props?.length) return out;

  const lastNight = stayNightDates(dateFrom, dateTo).at(-1) ?? dateFrom;
  const [{ data: cal, error: cErr }, { data: active, error: aErr }, { data: bks, error: bErr }] =
    await Promise.all([
      supabaseAdmin
        .from("property_rate_calendar")
        .select("property_id, date_from, date_to, kind, multiplier, fixed_price, priority, created_at")
        .in("property_id", props.map((p) => p.id))
        .lte("date_from", lastNight)
        .gte("date_to", dateFrom),
      supabaseAdmin.from("properties").select("id").eq("is_active", true),
      supabaseAdmin
        .from("bookings")
        .select("property_id, date_from, date_to, status")
        .lt("date_from", dateTo)
        .gt("date_to", dateFrom)
        .neq("status", "cancelled"),
    ]);
  const err = cErr ?? aErr ?? bErr;
  if (err) throw new Error(err.message);

  const activeIds = (active ?? []).map((r) => r.id);
  const occupancyByDate: Record<string, number> = {};
  for (const d of stayNightDates(dateFrom, dateTo)) {
    occupancyByDate[d] = occupancyForDate(d, activeIds, bks ?? []);
  }
  for (const p of props) {
    out[p.id] = {
      enabled: true,
      rateCalendar: ((cal ?? []).filter((r) => r.property_id === p.id) as unknown) as RateCalendarRow[],
      occupancyTiers: (p.occupancy_pricing as unknown as OccupancyTier[]) ?? [],
      minNightlyRate: p.min_nightly_rate != null ? Number(p.min_nightly_rate) : null,
      maxNightlyRate: p.max_nightly_rate != null ? Number(p.max_nightly_rate) : null,
      occupancyByDate,
    };
  }
  return out;
}
