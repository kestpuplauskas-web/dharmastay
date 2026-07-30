import { useState } from "react";
import { format, parse } from "date-fns";
import type { Property } from "@/lib/properties";
import { BOOKING_SOURCES, BOOKING_STATUSES, type BookingInput } from "@/lib/bookings.functions";
import { DateRangePicker } from "@/components/DateRangePicker";

export type BookingFormValues = Omit<BookingInput, "source" | "status"> & {
  source: (typeof BOOKING_SOURCES)[number];
  status: (typeof BOOKING_STATUSES)[number];
};

export function defaultBookingForm(props: Property[] = []): BookingFormValues {
  return {
    property_id: props[0]?.id ?? "",
    date_from: "",
    date_to: "",
    check_in_time: "15:00",
    check_out_time: "11:00",
    location: "",
    guests: 1,
    customer_name: "",
    customer_phone: "",
    customer_email: "",
    customer_address: "",
    customer_id_code: "",
    source: "phone",
    status: "confirmed",
    total_amount: 0,
    note: "",
  };
}

export function BookingForm({
  properties,
  initial,
  onSubmit,
  submitting,
}: {
  properties: Property[];
  initial: BookingFormValues;
  onSubmit: (v: BookingFormValues) => void;
  submitting?: boolean;
}) {
  const [v, setV] = useState<BookingFormValues>(initial);
  const set = <K extends keyof BookingFormValues>(k: K, val: BookingFormValues[K]) =>
    setV((s) => ({ ...s, [k]: val }));

  const parseDate = (s: string) => (s ? parse(s, "yyyy-MM-dd", new Date()) : undefined);
  const range = { from: parseDate(v.date_from), to: parseDate(v.date_to) };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(v);
      }}
      className="grid gap-4 md:grid-cols-2"
    >
      <label className="text-sm md:col-span-2">
        Objektas
        <select
          required
          value={v.property_id}
          onChange={(e) => set("property_id", e.target.value)}
          className="mt-1 w-full rounded border px-2 py-1"
        >
          <option value="">— Pasirinkite —</option>
          {properties.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </label>
      <div className="text-sm md:col-span-2">
        Atvykimo – išvykimo datos
        <DateRangePicker
          className="mt-1"
          value={range}
          placeholder="Pasirinkite datas"
          allowPast
          onChange={(r) =>
            setV((s) => ({
              ...s,
              date_from: r.from ? format(r.from, "yyyy-MM-dd") : "",
              date_to: r.to ? format(r.to, "yyyy-MM-dd") : "",
            }))
          }
        />
      </div>
      <label className="text-sm">
        Atvykimo laikas
        <input
          value={v.check_in_time}
          onChange={(e) => set("check_in_time", e.target.value)}
          className="mt-1 w-full rounded border px-2 py-1"
        />
      </label>
      <label className="text-sm">
        Išvykimo laikas
        <input
          value={v.check_out_time}
          onChange={(e) => set("check_out_time", e.target.value)}
          className="mt-1 w-full rounded border px-2 py-1"
        />
      </label>
      <label className="text-sm">
        Svečių
        <input
          type="number"
          min={1}
          value={v.guests}
          onChange={(e) => set("guests", Number(e.target.value))}
          className="mt-1 w-full rounded border px-2 py-1"
        />
      </label>
      <label className="text-sm">
        Vardas Pavardė
        <input
          required
          value={v.customer_name}
          onChange={(e) => set("customer_name", e.target.value)}
          className="mt-1 w-full rounded border px-2 py-1"
        />
      </label>
      <label className="text-sm">
        Telefonas
        <input
          value={v.customer_phone}
          onChange={(e) => set("customer_phone", e.target.value)}
          className="mt-1 w-full rounded border px-2 py-1"
        />
      </label>
      <label className="text-sm">
        El. paštas
        <input
          type="email"
          value={v.customer_email}
          onChange={(e) => set("customer_email", e.target.value)}
          className="mt-1 w-full rounded border px-2 py-1"
        />
      </label>
      <label className="text-sm">
        Adresas
        <input
          value={v.customer_address}
          onChange={(e) => set("customer_address", e.target.value)}
          className="mt-1 w-full rounded border px-2 py-1"
        />
      </label>
      <label className="text-sm">
        Šaltinis
        <select
          value={v.source}
          onChange={(e) => set("source", e.target.value as any)}
          className="mt-1 w-full rounded border px-2 py-1"
        >
          {BOOKING_SOURCES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </label>
      <label className="text-sm">
        Statusas
        <select
          value={v.status}
          onChange={(e) => set("status", e.target.value as any)}
          className="mt-1 w-full rounded border px-2 py-1"
        >
          {BOOKING_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </label>
      <label className="text-sm">
        Suma (€)
        <input
          type="number"
          step="0.01"
          value={v.total_amount}
          onChange={(e) => set("total_amount", Number(e.target.value))}
          className="mt-1 w-full rounded border px-2 py-1"
        />
      </label>
      <label className="text-sm md:col-span-2">
        Pastaba
        <textarea
          rows={3}
          value={v.note}
          onChange={(e) => set("note", e.target.value)}
          className="mt-1 w-full rounded border px-2 py-1"
        />
      </label>
      <div className="md:col-span-2">
        <button
          type="submit"
          disabled={submitting}
          className="rounded-md bg-primary px-6 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
        >
          {submitting ? "Saugoma…" : "Išsaugoti"}
        </button>
      </div>
    </form>
  );
}