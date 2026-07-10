export type PriceTier = {
  label: string;
  minDays: number;
  maxDays: number;
  pricePerDay: number;
};

export type FeatureGroup = {
  title: string;
  items: string[];
};

export type Booking = { from: string; to: string };

export type Car = {
  id: string;
  name: string;
  category: string;
  year: number;
  transmission: "Automatinė" | "Mechaninė" | string;
  seats: number;
  fuel: string;
  consumption: string;
  mileagePolicy: string;
  pricePerDay: number;
  image: string;
  images: string[];
  features: FeatureGroup[];
  priceTiers: PriceTier[];
  bookings: Booking[];
  isActive?: boolean;
  sortOrder?: number;
};

export const LOCATIONS: { name: string; fee: number }[] = [
  { name: "Klaipėda", fee: 0 },
  { name: "Palangos oro uostas", fee: 30 },
  { name: "Kauno oro uostas", fee: 100 },
  { name: "Vilniaus oro uostas", fee: 150 },
];

export const DEFAULT_FEATURES: FeatureGroup[] = [
  {
    title: "Komfortas",
    items: [
      "Oro kondicionierius (climate control)",
      "Šildomos priekinės sėdynės",
      "Elektra valdomi langai",
      "Centrinis užraktas su distanciniu valdymu",
      "Apsauga nuo saulės",
    ],
  },
  {
    title: "Saugumas",
    items: [
      "ABS, ESP, ASR sistemos",
      "Vairuotojo, keleivio ir šoninės oro pagalvės",
      "ISOFIX vaikiškos kėdutės tvirtinimas",
      "Atstumo iki kliūties jutikliai",
      "Galinio vaizdo kamera",
    ],
  },
  {
    title: "Multimedija",
    items: [
      "Bluetooth laisvų rankų įranga",
      "USB / AUX įvestys",
      "Apple CarPlay / Android Auto",
      "Navigacija",
    ],
  },
  {
    title: "Komplektacija",
    items: [
      "Žieminės padangos (sezono metu)",
      "Atsarginis ratas / remonto rinkinys",
      "Pirmosios pagalbos vaistinėlė ir gesintuvas",
      "Atšvaitinė liemenė ir avarinis trikampis",
    ],
  },
];

export function tiersFromBase(base: number): PriceTier[] {
  const r = (mult: number) => Math.round(base * mult);
  return [
    { label: "1 diena", minDays: 1, maxDays: 1, pricePerDay: r(1.5) },
    { label: "2 dienos", minDays: 2, maxDays: 2, pricePerDay: r(1.35) },
    { label: "3 – 6 dienos", minDays: 3, maxDays: 6, pricePerDay: r(1.15) },
    { label: "7 – 13 dienų", minDays: 7, maxDays: 13, pricePerDay: r(1.0) },
    { label: "14 – 29 dienų", minDays: 14, maxDays: 29, pricePerDay: r(0.92) },
    { label: "Ilgalaikė nuoma 30 – 179 dienų", minDays: 30, maxDays: 179, pricePerDay: r(0.85) },
    { label: "Ilgalaikė nuoma 180 – 364 dienų", minDays: 180, maxDays: 364, pricePerDay: r(0.75) },
    { label: "Ilgalaikė nuoma 365+ dienų", minDays: 365, maxDays: 9999, pricePerDay: r(0.65) },
  ];
}

export function isCarAvailable(car: Car, from: Date, to: Date): boolean {
  return car.bookings.every((b) => {
    const bFrom = new Date(b.from);
    const bTo = new Date(b.to);
    return to < bFrom || from > bTo;
  });
}

export function daysBetween(from: Date, to: Date): number {
  const ms = to.getTime() - from.getTime();
  return Math.max(1, Math.ceil(ms / (1000 * 60 * 60 * 24)));
}

export function priceForDays(car: Car, days: number): { tier: PriceTier; total: number } {
  const tier = car.priceTiers.find((t) => days >= t.minDays && days <= t.maxDays) ?? car.priceTiers[0];
  return { tier, total: tier.pricePerDay * days };
}
