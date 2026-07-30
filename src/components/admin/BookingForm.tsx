import { useState } from "react";
import { format, parse } from "date-fns";
import type { Property } from "@/lib/properties";
import {
  BOOKING_SOURCES,
  BOOKING_SOURCE_LABELS,
  BOOKING_STATUSES,
  BOOKING_STATUS_LABELS,
  BOOKING_SOURCE_VALUES,
  type BookingInput,
} from "@/lib/bookings.functions";
import { DateRangePicker } from "@/components/DateRangePicker";
import { DatePicker } from "@/components/DatePicker";
import { GuestsPicker } from "@/components/GuestsPicker";

export type BookingFormValues = Omit<BookingInput, "source" | "status"> & {
  source: (typeof BOOKING_SOURCE_VALUES)[number];
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
    adults_count: 1,
    children_count: 0,
    infants_count: 0,
    total_guests: 1,
    customer_name: "",
    customer_phone: "",
    customer_email: "",
    customer_address: "",
    customer_id_code: "",
    client_type: "person",
    birth_date: null,
    company_name: "",
    company_code: "",
    is_vat_payer: false,
    vat_number: "",
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
  const isCompany = v.client_type === "company";

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const totals = {
          total_guests: v.adults_count + v.children_count + v.infants_count,
          guests: v.adults_count + v.children_count + v.infants_count,
        };
        onSubmit(
          v.client_type === "company"
            ? {
                ...v,
                ...totals,
                birth_date: null,
                vat_number: v.is_vat_payer ? v.vat_number : "",
              }
            : {
                ...v,
                ...totals,
                company_name: "",
                company_code: "",
                is_vat_payer: false,
                vat_number: "",
              },
        );
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
      <div className="text-sm">
        Svečių skaičius
        <GuestsPicker
          className="mt-1"
          value={{ adults: v.adults_count, children: v.children_count, infants: v.infants_count }}
          onChange={(g) =>
            setV((s) => ({
              ...s,
              adults_count: g.adults,
              children_count: g.children,
              infants_count: g.infants,
              total_guests: g.adults + g.children + g.infants,
              guests: g.adults + g.children + g.infants,
            }))
          }
        />
      </div>
      <div className="md:col-span-2">
        <span className="text-sm">Kliento tipas</span>
        <div className="mt-1 inline-flex rounded-lg border p-1">
          {([
            ["person", "Fizinis asmuo"],
            ["company", "Juridinis asmuo"],
          ] as const).map(([val, label]) => (
            <button
              key={val}
              type="button"
              onClick={() => set("client_type", val)}
              className={
                "rounded-md px-4 py-1.5 text-sm font-medium transition " +
                (v.client_type === val
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground")
              }
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      <label className="text-sm">
        Vardas Pavardė
        <input
          required={!isCompany}
          value={v.customer_name}
          onChange={(e) => set("customer_name", e.target.value)}
          className="mt-1 w-full rounded border px-2 py-1"
        />
      </label>
      {isCompany && (
        <label className="text-sm">
          Įmonės pavadinimas *
          <input
            required
            value={v.company_name}
            onChange={(e) => set("company_name", e.target.value)}
            className="mt-1 w-full rounded border px-2 py-1"
          />
        </label>
      )}
      <label className="text-sm">
        El. paštas *
        <input
          type="email"
          required
          value={v.customer_email}
          onChange={(e) => set("customer_email", e.target.value)}
          className="mt-1 w-full rounded border px-2 py-1"
        />
      </label>
      <label className="text-sm">
        {isCompany ? "Įmonės buveinės adresas" : "Adresas"}
        <input
          value={v.customer_address}
          onChange={(e) => set("customer_address", e.target.value)}
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
      {!isCompany && (
        <label className="text-sm">
          Gimimo data
          <DatePicker
            className="mt-1"
            value={v.birth_date ?? ""}
            onChange={(val) => set("birth_date", val || null)}
          />
        </label>
      )}
      {isCompany && (
        <label className="text-sm">
          Įmonės kodas *
          <input
            required
            value={v.company_code}
            onChange={(e) => set("company_code", e.target.value)}
            className="mt-1 w-full rounded border px-2 py-1"
          />
        </label>
      )}
      {isCompany && (
        <div className="text-sm md:col-span-2 flex flex-wrap items-end gap-6">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={v.is_vat_payer}
              onChange={(e) => set("is_vat_payer", e.target.checked)}
              className="h-4 w-4"
            />
            Ar PVM mokėtojas
          </label>
          {v.is_vat_payer && (
            <label className="min-w-[240px] flex-1">
              PVM mokėtojo kodas
              <input
                required
                placeholder="LT100000000010"
                value={v.vat_number}
                onChange={(e) => set("vat_number", e.target.value)}
                className="mt-1 w-full rounded border px-2 py-1"
              />
            </label>
          )}
        </div>
      )}
      <label className="text-sm">
        Šaltinis
        <select
          value={v.source}
          onChange={(e) => set("source", e.target.value as any)}
          className="mt-1 w-full rounded border px-2 py-1"
        >
          {(BOOKING_SOURCES as readonly string[])
            .concat(v.source === "direct" ? ["direct"] : [])
            .map((s) => (
            <option key={s} value={s}>
              {BOOKING_SOURCE_LABELS[s] ?? s}
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
              {BOOKING_STATUS_LABELS[s] ?? s}
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