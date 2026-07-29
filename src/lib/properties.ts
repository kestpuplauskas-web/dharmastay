export const PROPERTY_TYPES = [
  { value: "apartment", label: "Apartamentai" },
  { value: "hotel", label: "Viešbutis" },
  { value: "cottage", label: "Atostogų namelis" },
  { value: "villa", label: "Vila" },
  { value: "guest_house", label: "Svečių namai" },
] as const;

export type PropertyTypeValue = (typeof PROPERTY_TYPES)[number]["value"];

export const AMENITIES = [
  "wifi",
  "kitchen",
  "parking",
  "air_conditioning",
  "washing_machine",
  "tv",
  "workspace",
  "terrace",
  "balcony",
  "pool",
  "sauna",
  "hot_tub",
  "bbq",
  "pet_friendly",
  "smoke_alarm",
  "first_aid",
  "iron",
  "hair_dryer",
  "coffee_machine",
  "extra_baby_bed",
] as const;

export const AMENITY_LABELS: Record<string, string> = {
  wifi: "Wi‑Fi",
  kitchen: "Virtuvėlė",
  parking: "Vieta automobiliui",
  air_conditioning: "Oro kondicionierius",
  washing_machine: "Skalbimo mašina",
  tv: "Televizorius",
  workspace: "Darbo vieta",
  terrace: "Terasa",
  balcony: "Balkonas",
  pool: "Baseinas",
  sauna: "Sauna",
  hot_tub: "Kubilas",
  bbq: "Kepsninė",
  pet_friendly: "Su augintiniais",
  smoke_alarm: "Dūmų detektorius",
  first_aid: "Pirmosios pagalbos rinkinys",
  iron: "Lygintuvas",
  hair_dryer: "Plaukų džiovintuvas",
  coffee_machine: "Kavos aparatas",
  extra_baby_bed: "Papildoma lovytė kambaryje (vaikui)",
};

export const ROOM_KINDS = [
  { value: "bedroom_1", label: "Miegamasis 1" },
  { value: "bedroom_2", label: "Miegamasis 2" },
  { value: "bedroom_3", label: "Miegamasis 3" },
  { value: "bedroom_4", label: "Miegamasis 4" },
  { value: "living_room", label: "Svetainė" },
] as const;

export const BED_TYPES = [
  { value: "extra_large_double", label: "Labai didelė dvigulė lova" },
  { value: "large_double", label: "Didelė dvigulė lova" },
  { value: "double", label: "Standartinė dvigulė lova" },
  { value: "single", label: "Vienvietė lova" },
  { value: "sofa_bed", label: "Miegamoji sofa" },
] as const;

export type RoomConfig = { kind: string; beds: number; bedType: string };

export type PriceTier = {
  label: string;
  minNights: number;
  maxNights: number;
  pricePerNight: number;
};

export type Rooms = {
  bedrooms?: number;
  living_rooms?: number;
  bathrooms?: number;
  kitchenette?: boolean;
  parking_spot?: boolean;
  notes?: string;
  configs?: RoomConfig[];
};

export type Booking = { from: string; to: string };

export type Property = {
  id: string;
  name: string;
  propertyType: PropertyTypeValue | string;
  description: string;
  address: string;
  city: string;
  country: string;
  lat: number | null;
  lng: number | null;
  areaM2: number | null;
  maxGuests: number;
  beds: number;
  rooms: Rooms;
  amenities: string[];
  pricePerNight: number;
  priceTiers: PriceTier[];
  image: string;
  images: string[];
  bookings: Booking[];
  isActive: boolean;
  sortOrder: number;
  status: "active" | "maintenance" | "blocked" | string;
  year: number;
  category: string;
};

export function nightsBetween(from: Date, to: Date): number {
  const ms = to.getTime() - from.getTime();
  return Math.max(1, Math.round(ms / (1000 * 60 * 60 * 24)));
}

export function priceForNights(
  p: Pick<Property, "pricePerNight" | "priceTiers">,
  nights: number,
): { tier: PriceTier | null; total: number; pricePerNight: number } {
  const tier =
    p.priceTiers.find((t) => nights >= t.minNights && nights <= t.maxNights) ?? null;
  const nightly = tier ? tier.pricePerNight : p.pricePerNight;
  return { tier, total: nightly * nights, pricePerNight: nightly };
}

export function isPropertyAvailable(p: Property, from: Date, to: Date): boolean {
  return p.bookings.every((b) => {
    const bFrom = new Date(b.from);
    const bTo = new Date(b.to);
    return to < bFrom || from > bTo;
  });
}

export function propertyTypeLabel(v: string): string {
  return PROPERTY_TYPES.find((t) => t.value === v)?.label ?? v;
}