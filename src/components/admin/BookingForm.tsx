import { useState, useEffect } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { listActiveCars } from "@/lib/cars.functions";
import { checkBookingConflicts, BOOKING_SOURCES, BOOKING_STATUSES, type BookingInput } from "@/lib/bookings.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DateInput } from "@/components/ui/date-input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle } from "lucide-react";
import { toast } from "sonner";

const SOURCE_LABELS: Record<(typeof BOOKING_SOURCES)[number], string> = {
  phone: "Telefonas",
  whatsapp: "WhatsApp",
  direct: "Tiesiogiai",
  "rentivo.lt": "rentivo.lt",
  other: "Kita",
};

const STATUS_LABELS: Record<(typeof BOOKING_STATUSES)[number], string> = {
  confirmed: "Vykdoma",
  pending: "Rezervuota",
  completed: "Atlikta",
  cancelled: "Atšaukta",
};

type Props = {
  initial?: Partial<BookingInput>;
  bookingNumber?: string;
  excludeId?: string;
  submitLabel: string;
  onSubmit: (data: BookingInput) => Promise<void> | void;
  busy?: boolean;
};

export function BookingForm({ initial, bookingNumber, excludeId, submitLabel, onSubmit, busy }: Props) {
  const listCars = useServerFn(listActiveCars);
  const checkConflicts = useServerFn(checkBookingConflicts);
  const carsQ = useQuery({ queryKey: ["active-cars-admin"], queryFn: () => listCars() });

  const [form, setForm] = useState<BookingInput>({
    car_id: initial?.car_id ?? "",
    date_from: initial?.date_from ?? "",
    date_to: initial?.date_to ?? "",
    pickup_time: initial?.pickup_time ?? "10:00",
    return_time: initial?.return_time ?? "10:00",
    pickup_location: initial?.pickup_location ?? "",
    return_location: initial?.return_location ?? "",
    customer_name: initial?.customer_name ?? "",
    customer_phone: initial?.customer_phone ?? "",
    customer_email: initial?.customer_email ?? "",
    customer_address: initial?.customer_address ?? "",
    customer_id_code: initial?.customer_id_code ?? "",
    mileage_out: initial?.mileage_out ?? null,
    mileage_in: initial?.mileage_in ?? null,
    source: initial?.source ?? "phone",
    status: initial?.status ?? "confirmed",
    total_amount: initial?.total_amount ?? 0,
    note: initial?.note ?? "",
  });

  const [conflicts, setConflicts] = useState<Array<{ id: string; date_from: string; date_to: string; customer_name: string; status: string }>>([]);
  const [overrideConflict, setOverrideConflict] = useState(false);

  const set = <K extends keyof BookingInput>(k: K, v: BookingInput[K]) => setForm((f) => ({ ...f, [k]: v }));

  useEffect(() => {
    if (!form.car_id || !form.date_from || !form.date_to) {
      setConflicts([]);
      return;
    }
    if (form.date_from > form.date_to) {
      setConflicts([]);
      return;
    }
    let cancelled = false;
    checkConflicts({ data: { car_id: form.car_id, date_from: form.date_from, date_to: form.date_to, excludeId } })
      .then((r) => { if (!cancelled) setConflicts(r); })
      .catch(() => { if (!cancelled) setConflicts([]); });
    return () => { cancelled = true; };
  }, [form.car_id, form.date_from, form.date_to, excludeId, checkConflicts]);

  const hasConflict = conflicts.length > 0;
  const emailValid = form.customer_email.trim() === "" || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.customer_email.trim());
  const canSubmit =
    !busy &&
    !!form.car_id &&
    !!form.date_from &&
    !!form.date_to &&
    !!form.customer_name.trim() &&
    emailValid &&
    (!hasConflict || overrideConflict);

  const handle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) {
      if (!form.car_id || !form.date_from || !form.date_to) toast.error("Užpildykite automobilį ir datas");
      else if (!form.customer_name.trim()) toast.error("Įveskite kliento vardą");
      else if (!emailValid) toast.error("Neteisingas el. paštas");
      else if (hasConflict && !overrideConflict) toast.error("Datų konfliktas — patvirtinkite, kad vis tiek norite išsaugoti");
      return;
    }
    await onSubmit(form);
  };

  const parseMileage = (v: string): number | null => {
    if (!v.trim()) return null;
    const n = parseInt(v, 10);
    return Number.isFinite(n) && n >= 0 ? n : null;
  };

  return (
    <form onSubmit={handle} className="space-y-8 max-w-3xl">
      {bookingNumber && (
        <div>
          <Label>Rezervacijos numeris</Label>
          <Input value={bookingNumber} disabled className="font-mono" />
        </div>
      )}

      <section className="space-y-4">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Automobilis ir datos</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <Label>Automobilis *</Label>
            <Select value={form.car_id} onValueChange={(v) => set("car_id", v)}>
              <SelectTrigger><SelectValue placeholder={carsQ.isLoading ? "Kraunama..." : "Pasirink automobilį"} /></SelectTrigger>
              <SelectContent>
                {carsQ.data?.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Paėmimo data *</Label>
            <DateInput value={form.date_from} onChange={(v) => set("date_from", v)} />
          </div>
          <div>
            <Label>Paėmimo laikas *</Label>
            <Input type="time" value={form.pickup_time} onChange={(e) => set("pickup_time", e.target.value)} />
          </div>
          <div>
            <Label>Grąžinimo data *</Label>
            <DateInput value={form.date_to} onChange={(v) => set("date_to", v)} />
          </div>
          <div>
            <Label>Grąžinimo laikas *</Label>
            <Input type="time" value={form.return_time} onChange={(e) => set("return_time", e.target.value)} />
          </div>
          <div>
            <Label>Paėmimo vieta *</Label>
            <Input value={form.pickup_location} onChange={(e) => set("pickup_location", e.target.value)} placeholder="Pvz. Vilnius, oro uostas" />
          </div>
          <div>
            <Label>Grąžinimo vieta *</Label>
            <Input value={form.return_location} onChange={(e) => set("return_location", e.target.value)} placeholder="Pvz. Vilnius, oro uostas" />
          </div>
        </div>

        {hasConflict && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <div className="font-semibold mb-1">Datų konfliktas su esamomis rezervacijomis:</div>
              <ul className="text-sm space-y-1">
                {conflicts.map((c) => (
                  <li key={c.id}>• {c.date_from} → {c.date_to} ({c.customer_name || "—"}, {STATUS_LABELS[c.status as keyof typeof STATUS_LABELS] ?? c.status})</li>
                ))}
              </ul>
              <label className="flex items-center gap-2 mt-3 text-sm cursor-pointer">
                <input type="checkbox" checked={overrideConflict} onChange={(e) => setOverrideConflict(e.target.checked)} />
                Suprantu ir vis tiek noriu išsaugoti
              </label>
            </AlertDescription>
          </Alert>
        )}
      </section>

      <section className="space-y-4">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Klientas</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label>Vardas, pavardė *</Label>
            <Input value={form.customer_name} onChange={(e) => set("customer_name", e.target.value)} placeholder="Jonas Jonaitis" />
          </div>
          <div>
            <Label>Telefonas *</Label>
            <Input value={form.customer_phone} onChange={(e) => set("customer_phone", e.target.value)} placeholder="+370..." />
          </div>
          <div>
            <Label>El. paštas *</Label>
            <Input type="email" value={form.customer_email} onChange={(e) => set("customer_email", e.target.value)} placeholder="vardas@pavyzdys.lt" />
          </div>
          <div>
            <Label>Įmonės kodas / gimimo data *</Label>
            <Input value={form.customer_id_code} onChange={(e) => set("customer_id_code", e.target.value)} placeholder="Pvz. 1985-04-12 arba 302345678" />
          </div>
          <div className="md:col-span-2">
            <Label>Gyv. vietos adresas *</Label>
            <Input value={form.customer_address} onChange={(e) => set("customer_address", e.target.value)} placeholder="Gatvė, namo nr., miestas" />
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Rida</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label>Rida perdavimo metu (km)</Label>
            <Input
              type="number"
              min="0"
              step="1"
              value={form.mileage_out ?? ""}
              onChange={(e) => set("mileage_out", parseMileage(e.target.value))}
              placeholder="Pvz. 125430"
            />
          </div>
          <div>
            <Label>Rida grąžinimo metu (km)</Label>
            <Input
              type="number"
              min="0"
              step="1"
              value={form.mileage_in ?? ""}
              onChange={(e) => set("mileage_in", parseMileage(e.target.value))}
              placeholder="Pvz. 125890"
            />
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Detalės</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label>Šaltinis</Label>
            <Select value={form.source} onValueChange={(v) => set("source", v as BookingInput["source"])}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {BOOKING_SOURCES.map((s) => <SelectItem key={s} value={s}>{SOURCE_LABELS[s]}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Statusas</Label>
            <Select value={form.status} onValueChange={(v) => set("status", v as BookingInput["status"])}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {BOOKING_STATUSES.map((s) => <SelectItem key={s} value={s}>{STATUS_LABELS[s]}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="md:col-span-2">
            <Label>Bendra suma (€)</Label>
            <Input type="number" step="0.01" min="0" value={form.total_amount} onChange={(e) => set("total_amount", Number(e.target.value) || 0)} />
          </div>
          <div className="md:col-span-2">
            <Label>Pastabos</Label>
            <Textarea value={form.note} onChange={(e) => set("note", e.target.value)} rows={3} />
          </div>
        </div>
      </section>


      <div className="flex gap-2">
        <Button type="submit" disabled={!canSubmit}>{busy ? "Saugoma..." : submitLabel}</Button>
      </div>
    </form>
  );
}
