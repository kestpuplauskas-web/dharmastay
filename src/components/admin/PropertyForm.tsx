import { useState } from "react";
import { AMENITIES, AMENITY_LABELS, PROPERTY_TYPES, type Property } from "@/lib/properties";
import { ImageUploader } from "@/components/admin/ImageUploader";

export type PropertyFormValues = {
  name: string;
  propertyType: string;
  description: string;
  address: string;
  city: string;
  country: string;
  lat: number | null;
  lng: number | null;
  areaM2: number | null;
  maxGuests: number;
  beds: number;
  rooms: {
    bedrooms?: number;
    living_rooms?: number;
    bathrooms?: number;
    kitchenette?: boolean;
    parking_spot?: boolean;
    notes?: string;
  };
  amenities: string[];
  pricePerNight: number;
  priceTiers: Array<{
    label: string;
    minNights: number;
    maxNights: number;
    pricePerNight: number;
  }>;
  coverImageUrl: string;
  imageUrls: string[];
  isActive: boolean;
  sortOrder: number;
  status: "active" | "maintenance" | "blocked";
  year: number;
  category: string;
};

export function propertyToForm(p: Property | null | undefined): PropertyFormValues {
  return {
    name: p?.name ?? "",
    propertyType: p?.propertyType ?? "apartment",
    description: p?.description ?? "",
    address: p?.address ?? "",
    city: p?.city ?? "",
    country: p?.country ?? "LT",
    lat: p?.lat ?? null,
    lng: p?.lng ?? null,
    areaM2: p?.areaM2 ?? null,
    maxGuests: p?.maxGuests ?? 2,
    beds: p?.beds ?? 1,
    rooms: p?.rooms ?? {},
    amenities: p?.amenities ?? [],
    pricePerNight: p?.pricePerNight ?? 60,
    priceTiers: p?.priceTiers ?? [],
    coverImageUrl: p?.image ?? "",
    imageUrls: p?.images ?? [],
    isActive: p?.isActive ?? true,
    sortOrder: p?.sortOrder ?? 0,
    status: (p?.status as "active" | "maintenance" | "blocked") ?? "active",
    year: p?.year ?? new Date().getFullYear(),
    category: p?.category ?? "",
  };
}

export function PropertyForm({
  initial,
  onSubmit,
  submitting,
}: {
  initial: PropertyFormValues;
  onSubmit: (v: PropertyFormValues) => void;
  submitting?: boolean;
}) {
  const [v, setV] = useState<PropertyFormValues>(initial);
  const set = <K extends keyof PropertyFormValues>(k: K, val: PropertyFormValues[K]) =>
    setV((s) => ({ ...s, [k]: val }));

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(v);
      }}
      className="space-y-6"
    >
      <section className="grid gap-3 rounded-lg border p-4 md:grid-cols-2">
        <label className="text-sm">
          Pavadinimas
          <input
            required
            value={v.name}
            onChange={(e) => set("name", e.target.value)}
            className="mt-1 w-full rounded border px-2 py-1"
          />
        </label>
        <label className="text-sm">
          Tipas
          <select
            value={v.propertyType}
            onChange={(e) => set("propertyType", e.target.value)}
            className="mt-1 w-full rounded border px-2 py-1"
          >
            {PROPERTY_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm md:col-span-2">
          Aprašymas
          <textarea
            value={v.description}
            onChange={(e) => set("description", e.target.value)}
            rows={4}
            className="mt-1 w-full rounded border px-2 py-1"
          />
        </label>
      </section>

      <section className="grid gap-3 rounded-lg border p-4 md:grid-cols-3">
        <label className="text-sm md:col-span-2">
          Adresas
          <input
            value={v.address}
            onChange={(e) => set("address", e.target.value)}
            className="mt-1 w-full rounded border px-2 py-1"
          />
        </label>
        <label className="text-sm">
          Miestas
          <input
            value={v.city}
            onChange={(e) => set("city", e.target.value)}
            className="mt-1 w-full rounded border px-2 py-1"
          />
        </label>
        <label className="text-sm">
          Šalis (ISO)
          <input
            value={v.country}
            onChange={(e) => set("country", e.target.value.toUpperCase())}
            maxLength={3}
            className="mt-1 w-full rounded border px-2 py-1"
          />
        </label>
      </section>

      <section className="grid gap-3 rounded-lg border p-4 md:grid-cols-4">
        <label className="text-sm">
          Plotas m²
          <input
            type="number"
            value={v.areaM2 ?? ""}
            onChange={(e) =>
              set("areaM2", e.target.value === "" ? null : Number(e.target.value))
            }
            className="mt-1 w-full rounded border px-2 py-1"
          />
        </label>
        <label className="text-sm">
          Max svečių
          <input
            type="number"
            min={1}
            value={v.maxGuests}
            onChange={(e) => set("maxGuests", Number(e.target.value))}
            className="mt-1 w-full rounded border px-2 py-1"
          />
        </label>
        <label className="text-sm">
          Lovų
          <input
            type="number"
            min={1}
            value={v.beds}
            onChange={(e) => set("beds", Number(e.target.value))}
            className="mt-1 w-full rounded border px-2 py-1"
          />
        </label>
        <label className="text-sm">
          Miegamųjų
          <input
            type="number"
            min={0}
            value={v.rooms.bedrooms ?? ""}
            onChange={(e) =>
              set("rooms", { ...v.rooms, bedrooms: Number(e.target.value) || 0 })
            }
            className="mt-1 w-full rounded border px-2 py-1"
          />
        </label>
        <label className="text-sm">
          Svetainių
          <input
            type="number"
            min={0}
            value={v.rooms.living_rooms ?? ""}
            onChange={(e) =>
              set("rooms", { ...v.rooms, living_rooms: Number(e.target.value) || 0 })
            }
            className="mt-1 w-full rounded border px-2 py-1"
          />
        </label>
        <label className="text-sm">
          Vonių
          <input
            type="number"
            min={0}
            value={v.rooms.bathrooms ?? ""}
            onChange={(e) =>
              set("rooms", { ...v.rooms, bathrooms: Number(e.target.value) || 0 })
            }
            className="mt-1 w-full rounded border px-2 py-1"
          />
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={!!v.rooms.kitchenette}
            onChange={(e) => set("rooms", { ...v.rooms, kitchenette: e.target.checked })}
          />
          Virtuvėlė
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={!!v.rooms.parking_spot}
            onChange={(e) => set("rooms", { ...v.rooms, parking_spot: e.target.checked })}
          />
          Vieta automobiliui
        </label>
      </section>

      <section className="rounded-lg border p-4">
        <h3 className="mb-2 text-sm font-semibold">Patogumai</h3>
        <div className="grid grid-cols-2 gap-1 md:grid-cols-4">
          {AMENITIES.map((a) => (
            <label key={a} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={v.amenities.includes(a)}
                onChange={(e) =>
                  set(
                    "amenities",
                    e.target.checked
                      ? [...v.amenities, a]
                      : v.amenities.filter((x) => x !== a),
                  )
                }
              />
              {AMENITY_LABELS[a] ?? a}
            </label>
          ))}
        </div>
      </section>

      <section className="grid gap-3 rounded-lg border p-4 md:grid-cols-3">
        <label className="text-sm">
          Kaina už naktį (€)
          <input
            type="number"
            step="0.01"
            min={0}
            value={v.pricePerNight}
            onChange={(e) => set("pricePerNight", Number(e.target.value))}
            className="mt-1 w-full rounded border px-2 py-1"
          />
        </label>
        <label className="text-sm">
          Rikiavimas
          <input
            type="number"
            value={v.sortOrder}
            onChange={(e) => set("sortOrder", Number(e.target.value))}
            className="mt-1 w-full rounded border px-2 py-1"
          />
        </label>
        <label className="flex items-center gap-2 text-sm pt-6">
          <input
            type="checkbox"
            checked={v.isActive}
            onChange={(e) => set("isActive", e.target.checked)}
          />
          Aktyvus (rodomas svetainėje)
        </label>
      </section>

      <section className="rounded-lg border p-4">
        <h3 className="mb-2 text-sm font-semibold">Sezoninės kainos (pagal naktų skaičių)</h3>
        {v.priceTiers.map((tier, idx) => (
          <div key={idx} className="mb-2 flex flex-wrap gap-2">
            <input
              placeholder="Etiketė"
              value={tier.label}
              onChange={(e) => {
                const next = [...v.priceTiers];
                next[idx] = { ...tier, label: e.target.value };
                set("priceTiers", next);
              }}
              className="flex-1 rounded border px-2 py-1 text-sm"
            />
            <input
              type="number"
              placeholder="Min naktų"
              value={tier.minNights}
              onChange={(e) => {
                const next = [...v.priceTiers];
                next[idx] = { ...tier, minNights: Number(e.target.value) };
                set("priceTiers", next);
              }}
              className="w-24 rounded border px-2 py-1 text-sm"
            />
            <input
              type="number"
              placeholder="Max naktų"
              value={tier.maxNights}
              onChange={(e) => {
                const next = [...v.priceTiers];
                next[idx] = { ...tier, maxNights: Number(e.target.value) };
                set("priceTiers", next);
              }}
              className="w-24 rounded border px-2 py-1 text-sm"
            />
            <input
              type="number"
              step="0.01"
              placeholder="€/naktis"
              value={tier.pricePerNight}
              onChange={(e) => {
                const next = [...v.priceTiers];
                next[idx] = { ...tier, pricePerNight: Number(e.target.value) };
                set("priceTiers", next);
              }}
              className="w-24 rounded border px-2 py-1 text-sm"
            />
            <button
              type="button"
              onClick={() => set("priceTiers", v.priceTiers.filter((_, i) => i !== idx))}
              className="text-destructive"
            >
              ×
            </button>
          </div>
        ))}
        <button
          type="button"
          className="mt-1 text-sm text-primary underline"
          onClick={() =>
            set("priceTiers", [
              ...v.priceTiers,
              { label: "", minNights: 1, maxNights: 1, pricePerNight: v.pricePerNight },
            ])
          }
        >
          + Pridėti tarifą
        </button>
      </section>

      <section className="rounded-lg border p-4">
        <ImageUploader
          cover={v.coverImageUrl}
          images={v.imageUrls}
          onChange={({ cover, images }) =>
            setV((s) => ({ ...s, coverImageUrl: cover, imageUrls: images }))
          }
          folder="properties"
        />
      </section>

      <button
        type="submit"
        disabled={submitting}
        className="rounded-md bg-primary px-6 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
      >
        {submitting ? "Saugoma…" : "Išsaugoti"}
      </button>
    </form>
  );
}