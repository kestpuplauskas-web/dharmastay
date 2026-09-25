import { recalcExtras, type BookingExtra, type ExtraCalcKind } from "./booking-extras";

export type PriceTierLike = { minNights: number; maxNights: number; pricePerNight: number };
export type ExtraServiceLike = { name: string; calc: ExtraCalcKind; pricePerDay: number };

export function nightsBetween(from: string, to: string): number {
  if (!from || !to) return 0;
  const ms = new Date(to).getTime() - new Date(from).getTime();
  if (Number.isNaN(ms)) return 0;
  return Math.max(0, Math.round(ms / (1000 * 60 * 60 * 24)));
}

/** Naktinė kaina pagal sezoninius įkainius (pagal naktų skaičių). */
export function nightlyRateFor(
  pricePerNight: number,
  tiers: PriceTierLike[],
  nights: number,
): number {
  const tier = (tiers ?? []).find(
    (t) => nights >= Number(t.minNights) && nights <= Number(t.maxNights),
  );
  return Number(tier?.pricePerNight ?? pricePerNight) || 0;
}

/* ───────────── Dinaminė kainodara ───────────── */

export type RateCalendarRow = {
  date_from: string; // YYYY-MM-DD, IMTINA
  date_to: string; // YYYY-MM-DD, IMTINA
  kind: "season" | "event" | "manual";
  multiplier: number | null;
  fixed_price: number | null;
  priority: number;
  created_at?: string;
};

export type OccupancyTier = { minOccupancyPct: number; multiplier: number };

export type NightPrice = {
  date: string;
  base: number;
  price: number;
  source: "base" | "season" | "event" | "manual" | "occupancy";
  multiplier: number;
};

export type DynamicPricingInput = {
  enabled: boolean;
  rateCalendar: RateCalendarRow[];
  occupancyTiers: OccupancyTier[];
  minNightlyRate: number | null;
  maxNightlyRate: number | null;
  occupancyByDate: Record<string, number>;
};

const KIND_RANK: Record<RateCalendarRow["kind"], number> = { manual: 3, event: 2, season: 1 };

/** Datos imtinos abiem galais. Persidengimą sprendžia priority → kind → naujausia. */
export function rateCalendarRowFor(rows: RateCalendarRow[], date: string): RateCalendarRow | null {
  let best: RateCalendarRow | null = null;
  for (const r of rows ?? []) {
    if (date < r.date_from || date > r.date_to) continue;
    if (!best) { best = r; continue; }
    const p = Number(r.priority) - Number(best.priority);
    if (p > 0) { best = r; continue; }
    if (p < 0) continue;
    const k = KIND_RANK[r.kind] - KIND_RANK[best.kind];
    if (k > 0) { best = r; continue; }
    if (k < 0) continue;
    if ((r.created_at ?? "") > (best.created_at ?? "")) best = r;
  }
  return best;
}

export function occupancyMultiplierFor(tiers: OccupancyTier[], occupancyPct: number): number {
  let bestPct = -Infinity;
  let mult = 1;
  for (const t of tiers ?? []) {
    const min = Number(t.minOccupancyPct);
    if (min <= occupancyPct && min > bestPct) {
      bestPct = min;
      mult = Number(t.multiplier) || 1;
    }
  }
  return mult;
}

export function priceForNight(base: number, date: string, input: DynamicPricingInput): NightPrice {
  if (!input?.enabled) return { date, base, price: base, source: "base", multiplier: 1 };
  const row = rateCalendarRowFor(input.rateCalendar, date);
  let price: number;
  let multiplier = 1;
  let source: NightPrice["source"] = "base";
  if (row && row.fixed_price != null) {
    price = Number(row.fixed_price);
    source = "manual";
  } else {
    const calMult = row?.multiplier != null ? Number(row.multiplier) : 1;
    const occMult = occupancyMultiplierFor(input.occupancyTiers, input.occupancyByDate?.[date] ?? 0);
    multiplier = calMult * occMult;
    price = base * multiplier;
    if (row) source = row.kind;
    else if (occMult !== 1) source = "occupancy";
  }
  if (input.minNightlyRate != null && price < input.minNightlyRate) price = input.minNightlyRate;
  if (input.maxNightlyRate != null && price > input.maxNightlyRate) price = input.maxNightlyRate;
  return { date, base, price: Math.round(price * 100) / 100, source, multiplier };
}

function addDays(iso: string, n: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/** Naktų datos [from, to) — išvykimo diena neįskaičiuojama. */
export function stayNightDates(from: string, to: string): string[] {
  const n = nightsBetween(from, to);
  const out: string[] = [];
  for (let i = 0; i < n; i++) out.push(addDays(from.slice(0, 10), i));
  return out;
}

/** Užimtumas % visam objektui: date_from <= data < date_to, ne atšauktos. */
export function occupancyForDate(
  date: string,
  activePropertyIds: string[],
  bookings: Array<{ property_id: string; date_from: string; date_to: string; status: string }>,
): number {
  if (!activePropertyIds.length) return 0;
  const active = new Set(activePropertyIds);
  const occupied = new Set<string>();
  for (const b of bookings) {
    if (b.status === "cancelled" || !active.has(b.property_id)) continue;
    if (b.date_from <= date && date < b.date_to) occupied.add(b.property_id);
  }
  return (occupied.size / active.size) * 100;
}

/* ───────────── Quote ───────────── */

export type QuoteInput = {
  pricePerNight: number;
  priceTiers: PriceTierLike[];
  extraServices: ExtraServiceLike[];
  dateFrom: string;
  dateTo: string;
  adults: number;
  children: number;
  infants: number;
  selectedExtras: Array<{ name: string }>;
  dynamicPricing?: DynamicPricingInput;
};

export type QuoteResult = {
  nights: number;
  nightly_rate: number;
  stay_total: number;
  nights_breakdown: NightPrice[];
  extras: BookingExtra[];
  extras_total: number;
  total: number;
};

/** Vienas kainos skaičiavimo šaltinis: quote ir rezervacijos API. */
export function computeQuote(input: QuoteInput): QuoteResult {
  const nights = nightsBetween(input.dateFrom, input.dateTo);
  const baseRate = nightlyRateFor(input.pricePerNight, input.priceTiers ?? [], nights);
  const dyn = input.dynamicPricing;
  const dates = stayNightDates(input.dateFrom, input.dateTo);
  const breakdown: NightPrice[] = dyn?.enabled
    ? dates.map((d) => priceForNight(baseRate, d, dyn))
    : dates.map((d) => ({ date: d, base: baseRate, price: baseRate, source: "base", multiplier: 1 }));
  const stayTotal = dyn?.enabled
    ? Math.round(breakdown.reduce((s, n) => s + n.price, 0) * 100) / 100
    : baseRate * nights;
  const nightMultipliers = dyn?.enabled
    ? breakdown.map((n) => (n.source === "manual" ? 1 : n.multiplier))
    : undefined;
  const { extras, extras_total } = recalcExtras(
    input.extraServices ?? [],
    input.selectedExtras ?? [],
    { adults: input.adults, children: input.children, infants: input.infants, days: nights },
    nightMultipliers,
  );
  return {
    nights,
    nightly_rate: dyn?.enabled && nights > 0 ? Math.round((stayTotal / nights) * 100) / 100 : baseRate,
    stay_total: stayTotal,
    nights_breakdown: breakdown,
    extras,
    extras_total,
    total: stayTotal + extras_total,
  };
}
