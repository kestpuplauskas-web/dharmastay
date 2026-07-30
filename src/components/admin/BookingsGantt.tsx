import { useState, useMemo, useEffect, useRef } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Pencil } from "lucide-react";

type Booking = {
  id: string;
  property_id: string;
  date_from: string;
  date_to: string;
  status: string;
  customer_name: string;
  customer_phone?: string;
  customer_email?: string;
  check_in_time?: string;
  check_out_time?: string;
  location?: string;
  total_amount: number | string;
  note?: string | null;
  booking_number?: string | null;
  properties?: { name?: string } | null;
};

type Property = { id: string; name: string; propertyType?: string | null };

export type RescheduleInput = {
  id: string;
  property_id: string;
  date_from: string;
  date_to: string;
};

type BarDrag = {
  booking: Booking;
  mode: "move" | "resize-start" | "resize-end";
  originX: number;
  propertyId: string;
  fromISO: string;
  toISO: string;
  moved: boolean;
};

const STATUS_LABELS: Record<string, string> = {
  confirmed: "Vykdoma",
  pending: "Rezervuota",
  completed: "Atlikta",
  cancelled: "Atšaukta",
};

const STATUS_CLASSES: Record<string, string> = {
  pending: "bg-yellow-400 hover:bg-yellow-500 text-yellow-950 border-yellow-600",
  confirmed: "bg-green-500 hover:bg-green-600 text-white border-green-700",
  cancelled: "bg-red-500 hover:bg-red-600 text-white border-red-700 opacity-70",
  completed: "bg-gray-400 hover:bg-gray-500 text-white border-gray-600",
};

const MONTH_SHORT = ["sau", "vas", "kov", "bal", "geg", "bir", "lie", "rgp", "rgs", "spa", "lap", "gru"];

function toISODate(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function parseISO(s: string) {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

function addDays(d: Date, n: number) {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

function daysBetween(a: Date, b: Date) {
  return Math.round((b.getTime() - a.getTime()) / 86400000);
}

export function BookingsGantt({
  properties,
  bookings,
  onReschedule,
  rescheduling,
}: {
  properties: Property[];
  bookings: Booking[];
  onReschedule?: (input: RescheduleInput) => void;
  rescheduling?: boolean;
}) {
  const navigate = useNavigate();
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const update = () => setIsMobile(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  const dayCount = isMobile ? 14 : 60;
  const navStep = isMobile ? 7 : 14;

  const todayStart = useMemo(() => {
    const t = new Date();
    t.setHours(0, 0, 0, 0);
    return t;
  }, []);

  const [startDate, setStartDate] = useState<Date>(todayStart);

  const days = useMemo(
    () => Array.from({ length: dayCount }, (_, i) => addDays(startDate, i)),
    [startDate, dayCount],
  );
  const endDate = days[days.length - 1];
  const [selected, setSelected] = useState<Booking | null>(null);

  const visibleBookings = useMemo(() => {
    const startISO = toISODate(startDate);
    const endISO = toISODate(endDate);
    return bookings.filter((b) => b.date_from <= endISO && b.date_to >= startISO);
  }, [bookings, startDate, endDate]);

  const todayIndex = daysBetween(startDate, todayStart);

  const [drag, setDrag] = useState<{ propertyId: string; startIdx: number; endIdx: number } | null>(null);

  const goToNew = (propertyId: string, fromIdx: number, toIdx: number) => {
    const a = Math.min(fromIdx, toIdx);
    const b = Math.max(fromIdx, toIdx);
    const fromISO = toISODate(addDays(startDate, a));
    const toISO = toISODate(addDays(startDate, b === a ? a + 1 : b));
    navigate({
      to: "/admin/bookings/new",
      search: { propertyId, from: fromISO, to: toISO } as never,
    });
  };

  useEffect(() => {
    if (!drag) return;
    const onUp = () => {
      setDrag(null);
      goToNew(drag.propertyId, drag.startIdx, drag.endIdx);
    };
    window.addEventListener("pointerup", onUp);
    return () => window.removeEventListener("pointerup", onUp);
  }, [drag]);

  const colMinWidth = isMobile ? 36 : 28;
  const labelColWidth = isMobile ? 120 : 200;
  const gridTemplate = `${labelColWidth}px repeat(${dayCount}, minmax(${colMinWidth}px, 1fr))`;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={() => setStartDate(addDays(startDate, -navStep))}>
            <ChevronLeft className="h-4 w-4 mr-1" /> Atgal
          </Button>
          <Button size="sm" variant="outline" onClick={() => setStartDate(todayStart)}>
            <CalendarIcon className="h-4 w-4 mr-1" /> Šiandien
          </Button>
          <Button size="sm" variant="outline" onClick={() => setStartDate(addDays(startDate, navStep))}>
            Pirmyn <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
        <div className="text-sm text-muted-foreground">
          {startDate.getDate()} {MONTH_SHORT[startDate.getMonth()]} – {endDate.getDate()} {MONTH_SHORT[endDate.getMonth()]} {endDate.getFullYear()}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 text-xs">
        <span className="inline-flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-yellow-400 border border-yellow-600" /> Rezervuota</span>
        <span className="inline-flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-green-500 border border-green-700" /> Vykdoma</span>
        <span className="inline-flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-red-500 border border-red-700" /> Atšaukta</span>
        <span className="inline-flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-gray-400 border border-gray-600" /> Atlikta</span>
      </div>

      <div className="border rounded-lg overflow-x-auto bg-card">
        <div style={{ minWidth: labelColWidth + dayCount * colMinWidth }}>
          <div
            className="grid border-b bg-muted/40 sticky top-0 z-10"
            style={{ gridTemplateColumns: gridTemplate }}
          >
            <div className="px-3 py-2 text-xs font-semibold text-muted-foreground border-r">Objektas</div>
            {days.map((d, i) => {
              const isWeekStart = i % 7 === 0;
              const isWeekend = d.getDay() === 0 || d.getDay() === 6;
              return (
                <div
                  key={i}
                  className={`text-[10px] text-center py-2 border-r last:border-r-0 ${isWeekend ? "bg-muted/40" : ""}`}
                >
                  {isWeekStart ? (
                    <div className="font-semibold text-foreground">
                      {d.getDate()} {MONTH_SHORT[d.getMonth()]}
                    </div>
                  ) : (
                    <div className="text-muted-foreground">{d.getDate()}</div>
                  )}
                </div>
              );
            })}
          </div>

          {properties.map((p) => {
            const rowBookings = visibleBookings.filter((b) => b.property_id === p.id);
            return (
              <div
                key={p.id}
                className="grid border-b last:border-b-0 relative"
                style={{ gridTemplateColumns: gridTemplate, minHeight: 56 }}
              >
                <div className="px-3 py-2 text-sm border-r flex flex-col justify-center bg-muted/20 sticky left-0 z-[5]">
                  <div className="font-medium truncate">{p.name}</div>
                  {p.propertyType && (
                    <div className="text-xs text-muted-foreground truncate">{p.propertyType}</div>
                  )}
                </div>
                {days.map((d, i) => {
                  const isWeekend = d.getDay() === 0 || d.getDay() === 6;
                  const inDrag =
                    drag?.propertyId === p.id &&
                    i >= Math.min(drag.startIdx, drag.endIdx) &&
                    i <= Math.max(drag.startIdx, drag.endIdx);
                  return (
                    <button
                      key={i}
                      type="button"
                      onPointerDown={(e) => {
                        e.preventDefault();
                        setDrag({ propertyId: p.id, startIdx: i, endIdx: i });
                      }}
                      onPointerEnter={() => {
                        if (drag?.propertyId === p.id) setDrag({ ...drag, endIdx: i });
                      }}
                      className={`border-r last:border-r-0 hover:bg-primary/10 transition-colors select-none ${
                        inDrag ? "bg-primary/25" : isWeekend ? "bg-muted/30" : ""
                      }`}
                      aria-label={`Nauja rezervacija ${toISODate(d)}`}
                    />
                  );
                })}

                {todayIndex >= 0 && todayIndex < dayCount && (
                  <div
                    className="absolute top-0 bottom-0 w-px bg-red-500 z-20 pointer-events-none"
                    style={{
                      left: `calc(${labelColWidth}px + ((100% - ${labelColWidth}px) * ${todayIndex} / ${dayCount}))`,
                    }}
                  />
                )}

                {rowBookings.map((b) => {
                  const bFrom = parseISO(b.date_from);
                  const bTo = parseISO(b.date_to);
                  const startIdx = Math.max(0, daysBetween(startDate, bFrom));
                  const endIdx = Math.min(dayCount - 1, daysBetween(startDate, bTo));
                  if (endIdx < startIdx) return null;
                  const colStart = 2 + startIdx;
                  const colEnd = 2 + endIdx + 1;
                  const cls = STATUS_CLASSES[b.status] ?? "bg-gray-400 text-white border-gray-600";
                  return (
                    <button
                      key={b.id}
                      type="button"
                      onClick={() => setSelected(b)}
                      className={`m-1 px-2 py-1 rounded text-xs font-medium truncate border shadow-sm cursor-pointer z-10 text-left ${cls}`}
                      style={{ gridColumn: `${colStart} / ${colEnd}`, gridRow: 1 }}
                      title={`${b.customer_name} · ${b.date_from} → ${b.date_to}`}
                    >
                      {b.booking_number ? <span className="font-mono opacity-80 mr-1">{b.booking_number}</span> : null}
                      {b.customer_name || "—"}
                    </button>
                  );
                })}
              </div>
            );
          })}

          {properties.length === 0 && (
            <div className="p-8 text-center text-muted-foreground">Nėra objektų</div>
          )}
        </div>
      </div>

      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 flex-wrap">
              {selected?.booking_number && (
                <span className="font-mono text-xs px-2 py-0.5 rounded bg-muted">{selected.booking_number}</span>
              )}
              <span>{selected?.properties?.name ?? "Rezervacija"}</span>
            </DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-2 text-sm">
              <div><span className="text-muted-foreground">Statusas:</span> {STATUS_LABELS[selected.status] ?? selected.status}</div>
              <div><span className="text-muted-foreground">Klientas:</span> {selected.customer_name || "—"}</div>
              {selected.customer_phone && <div><span className="text-muted-foreground">Telefonas:</span> {selected.customer_phone}</div>}
              {selected.customer_email && <div><span className="text-muted-foreground">El. paštas:</span> {selected.customer_email}</div>}
              <div>
                <span className="text-muted-foreground">Laikotarpis:</span>{" "}
                {selected.date_from} {selected.check_in_time} → {selected.date_to} {selected.check_out_time}
              </div>
              {selected.location && <div><span className="text-muted-foreground">Vieta:</span> {selected.location}</div>}
              <div><span className="text-muted-foreground">Suma:</span> <span className="font-semibold text-primary">{Number(selected.total_amount).toFixed(2)}€</span></div>
              {selected.note && <div className="italic text-muted-foreground">„{selected.note}"</div>}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelected(null)}>Uždaryti</Button>
            {selected && (
              <Button onClick={() => { const id = selected.id; setSelected(null); navigate({ to: "/admin/bookings/$id", params: { id } }); }}>
                <Pencil className="h-4 w-4 mr-1" /> Redaguoti
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}