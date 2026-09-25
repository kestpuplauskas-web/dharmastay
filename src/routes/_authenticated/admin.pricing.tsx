import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  bulkSetDynamicPricing,
  deleteRateCalendarRow,
  getPricingHeatmap,
  listPricingOverview,
  listRateCalendarMulti,
  saveRateCalendarBulk,
} from "@/lib/pricing-rules.functions";
import { DynamicPricingPanel } from "@/components/admin/DynamicPricingPanel";

export const Route = createFileRoute("/_authenticated/admin/pricing")({
  component: PricingPage,
});

type Kind = "season" | "event" | "manual";
const KIND_LABEL: Record<Kind, string> = { season: "Sezonas", event: "Šventė", manual: "Tiksli kaina" };
const KIND_PRIORITY: Record<Kind, number> = { season: 0, event: 10, manual: 100 };
const MONTHS = [
  "Sausis", "Vasaris", "Kovas", "Balandis", "Gegužė", "Birželis",
  "Liepa", "Rugpjūtis", "Rugsėjis", "Spalis", "Lapkritis", "Gruodis",
];
const WEEKDAYS = ["P", "A", "T", "K", "P", "Š", "S"];

function errText(e: unknown): string {
  const msg = e instanceof Error ? e.message : String(e);
  try {
    const parsed = JSON.parse(msg);
    if (Array.isArray(parsed) && parsed[0]?.message) return parsed[0].message;
  } catch {
    /* ne JSON */
  }
  return msg;
}

/** Šilumos spalva pagal kainos santykį su bazine. */
function heatColor(ratio: number): string {
  if (ratio <= 0.9) return "hsl(205 70% 72%)";
  if (ratio < 1.01) return "hsl(200 30% 88%)";
  if (ratio < 1.1) return "hsl(140 55% 72%)";
  if (ratio < 1.25) return "hsl(55 85% 68%)";
  if (ratio < 1.5) return "hsl(28 90% 66%)";
  if (ratio < 2) return "hsl(5 80% 66%)";
  return "hsl(288 55% 62%)";
}

const pad = (n: number) => String(n).padStart(2, "0");
const iso = (y: number, m: number, d: number) => `${y}-${pad(m + 1)}-${pad(d)}`;
const daysInMonth = (y: number, m: number) => new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
const firstWeekday = (y: number, m: number) => (new Date(Date.UTC(y, m, 1)).getUTCDay() + 6) % 7;

const emptyRule = {
  label: "",
  kind: "season" as Kind,
  date_from: "",
  date_to: "",
  mode: "multiplier" as "multiplier" | "fixed",
  multiplier: "1.30",
  fixed_price: "",
  priority: "0",
  color: "#f59e0b",
};
const PALETTE = ["#f59e0b", "#ef4444", "#ec4899", "#8b5cf6", "#3b82f6", "#06b6d4", "#10b981", "#84cc16", "#64748b"];

function PricingPage() {
  const qc = useQueryClient();
  const fetchOverview = useServerFn(listPricingOverview);
  const fetchRules = useServerFn(listRateCalendarMulti);
  const fetchHeatmap = useServerFn(getPricingHeatmap);
  const saveBulkFn = useServerFn(saveRateCalendarBulk);
  const deleteRowFn = useServerFn(deleteRateCalendarRow);
  const bulkToggleFn = useServerFn(bulkSetDynamicPricing);

  const [year, setYear] = useState(new Date().getFullYear());
  const [propertyId, setPropertyId] = useState<string | null>(null);

  const overviewQ = useQuery({ queryKey: ["pricing-overview"], queryFn: () => fetchOverview() });
  const properties = overviewQ.data ?? [];

  const rulesQ = useQuery({
    queryKey: ["pricing-rules", propertyId],
    queryFn: () => fetchRules({ data: { property_id: propertyId } }),
  });
  const rules = (rulesQ.data ?? []) as any[];

  const heatQ = useQuery({
    queryKey: ["pricing-heatmap", propertyId, year],
    queryFn: () =>
      fetchHeatmap({
        data: { property_id: propertyId, date_from: `${year}-01-01`, date_to: `${year + 1}-01-01` },
      }),
  });
  const byDate = useMemo(() => {
    const m: Record<string, { price: number; ratio: number; occupancy: number; source: string }> = {};
    for (const d of heatQ.data?.days ?? []) m[d.date] = d;
    return m;
  }, [heatQ.data]);

  /* Taisyklė, taikoma dienai (aukščiausias prioritetas) — spalvai kalendoriuje */
  const ruleForDate = (date: string) => {
    let best: any = null;
    for (const r of rules) {
      if (r.date_from <= date && r.date_to >= date && (!best || r.priority > best.priority)) best = r;
    }
    return best;
  };
  const [pickStart, setPickStart] = useState<string | null>(null);
  const onDayClick = (date: string) => {
    if (!pickStart) {
      setPickStart(date);
      setForm((f) => ({ ...f, date_from: date, date_to: date }));
    } else {
      const [a, b] = pickStart <= date ? [pickStart, date] : [date, pickStart];
      setForm((f) => ({ ...f, date_from: a, date_to: b }));
      setPickStart(null);
    }
  };

  const propName = (id: string) => properties.find((p) => p.id === id)?.name ?? "—";

  /* ── Nauja taisyklė ── */
  const [form, setForm] = useState(emptyRule);
  const [applyAll, setApplyAll] = useState(true);
  const [targets, setTargets] = useState<string[]>([]);
  const targetIds = applyAll ? properties.map((p) => p.id) : targets;
  const formValid =
    form.label.trim() &&
    form.date_from &&
    form.date_to &&
    form.date_to >= form.date_from &&
    targetIds.length > 0 &&
    (form.mode === "multiplier" ? Number(form.multiplier) > 0 : Number(form.fixed_price) >= 0 && form.fixed_price !== "");

  const saveBulk = useMutation({
    mutationFn: () =>
      saveBulkFn({
        data: {
          property_ids: targetIds,
          label: form.label.trim(),
          kind: form.kind,
          date_from: form.date_from,
          date_to: form.date_to,
          multiplier: form.mode === "multiplier" ? Number(form.multiplier) : null,
          fixed_price: form.mode === "fixed" ? Number(form.fixed_price) : null,
          priority: Number(form.priority) || 0,
          color: form.color,
        },
      }),
    onSuccess: (r) => {
      toast.success(`Taisyklė pritaikyta ${r.count} objektui (-ams)`);
      setForm(emptyRule);
      qc.invalidateQueries({ queryKey: ["pricing-rules"] });
      qc.invalidateQueries({ queryKey: ["pricing-heatmap"] });
      qc.invalidateQueries({ queryKey: ["rate-calendar"] });
    },
    onError: (e) => toast.error(errText(e)),
  });

  const [toDelete, setToDelete] = useState<any | null>(null);
  const delRow = useMutation({
    mutationFn: (id: string) => deleteRowFn({ data: { id } }),
    onSuccess: () => {
      toast.success("Ištrinta");
      qc.invalidateQueries({ queryKey: ["pricing-rules"] });
      qc.invalidateQueries({ queryKey: ["pricing-heatmap"] });
      qc.invalidateQueries({ queryKey: ["rate-calendar"] });
    },
    onError: (e) => toast.error(errText(e)),
  });

  const toggle = useMutation({
    mutationFn: (v: { ids: string[]; enabled: boolean }) =>
      bulkToggleFn({ data: { property_ids: v.ids, enabled: v.enabled } }),
    onSuccess: (_d, v) => {
      toast.success(v.enabled ? "Dinaminė kainodara įjungta" : "Dinaminė kainodara išjungta");
      qc.invalidateQueries({ queryKey: ["pricing-overview"] });
      qc.invalidateQueries({ queryKey: ["pricing-heatmap"] });
      qc.invalidateQueries({ queryKey: ["dyn-pricing"] });
    },
    onError: (e) => toast.error(errText(e)),
  });

  return (
    <div className="space-y-8 p-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Kainodara</h1>
          <p className="text-sm text-muted-foreground">
            Visų objektų kainos vienoje vietoje — kalendorius, sezonai, šventės ir užimtumo poveikis.
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <div className="space-y-1">
            <Label htmlFor="pr-prop">Objektas</Label>
            <select
              id="pr-prop"
              className="h-10 min-w-56 rounded-md border bg-background px-3 text-sm"
              value={propertyId ?? ""}
              onChange={(e) => setPropertyId(e.target.value || null)}
            >
              <option value="">Visi objektai (vidurkis)</option>
              {properties.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="pr-year">Metai</Label>
            <div className="flex items-center gap-1">
              <Button variant="outline" size="sm" onClick={() => setYear((y) => y - 1)} aria-label="Ankstesni metai">
                ‹
              </Button>
              <Input id="pr-year" className="w-24 text-center" type="number" value={year} onChange={(e) => setYear(Number(e.target.value) || year)} />
              <Button variant="outline" size="sm" onClick={() => setYear((y) => y + 1)} aria-label="Kiti metai">
                ›
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Šilumos kalendorius */}
      <section className="space-y-3 rounded-xl border bg-card p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">Kainų kalendorius {year}</h2>
            <p className="text-xs text-muted-foreground">
              {pickStart
                ? `Pradžia: ${pickStart}. Paspauskite pabaigos dieną.`
                : "Paspauskite pradžios ir pabaigos dieną — datos įsirašys į naują taisyklę. Dienos su taisykle rodomos jos spalva."}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
            {[
              ["Pigiau", 0.85],
              ["Bazinė", 1],
              ["+10 %", 1.15],
              ["+30 %", 1.3],
              ["+60 %", 1.6],
              ["Pikas", 2.2],
            ].map(([l, r]) => (
              <span key={String(l)} className="flex items-center gap-1">
                <span className="h-3 w-3 rounded-sm border" style={{ backgroundColor: heatColor(Number(r)) }} />
                {l}
              </span>
            ))}
          </div>
        </div>
        {heatQ.isLoading ? (
          <p className="text-sm text-muted-foreground">Kraunama…</p>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
            {MONTHS.map((mLabel, m) => (
              <div key={m} className="space-y-1">
                <p className="text-sm font-medium">{mLabel}</p>
                <div className="grid grid-cols-7 gap-[2px] text-[10px] text-muted-foreground">
                  {WEEKDAYS.map((w, i) => (
                    <span key={i} className="text-center">{w}</span>
                  ))}
                  {Array.from({ length: firstWeekday(year, m) }).map((_, i) => (
                    <span key={`b${i}`} />
                  ))}
                  {Array.from({ length: daysInMonth(year, m) }).map((_, i) => {
                    const date = iso(year, m, i + 1);
                    const cell = byDate[date];
                    const rule = ruleForDate(date);
                    const selected = form.date_from && form.date_to && date >= form.date_from && date <= form.date_to;
                    return (
                      <button
                        type="button"
                        key={date}
                        onClick={() => onDayClick(date)}
                        title={
                          (cell
                            ? `${date} · ${cell.price.toFixed(2)} € · užimtumas ${cell.occupancy} %`
                            : date) + (rule ? ` · ${rule.label}` : "")
                        }
                        className={`relative flex h-6 items-center justify-center overflow-hidden rounded-sm border text-[10px] text-foreground ${
                          selected ? "ring-2 ring-primary ring-offset-1" : ""
                        }`}
                        style={
                          rule
                            ? { backgroundColor: rule.color ?? "#f59e0b" }
                            : cell
                              ? { backgroundColor: heatColor(cell.ratio) }
                              : undefined
                        }
                      >
                        {i + 1}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Nauja taisyklė */}
      <section className="space-y-4 rounded-xl border bg-card p-6">
        <h2 className="text-lg font-semibold">Nauja kainų taisyklė</h2>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="space-y-1">
            <Label htmlFor="pr-label">Pavadinimas</Label>
            <Input id="pr-label" value={form.label} placeholder="pvz., Vasaros sezonas" onChange={(e) => setForm({ ...form, label: e.target.value })} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="pr-kind">Tipas</Label>
            <select
              id="pr-kind"
              className="h-10 w-full rounded-md border bg-background px-3 text-sm"
              value={form.kind}
              onChange={(e) => {
                const k = e.target.value as Kind;
                setForm({ ...form, kind: k, priority: String(KIND_PRIORITY[k]) });
              }}
            >
              {(Object.keys(KIND_LABEL) as Kind[]).map((k) => (
                <option key={k} value={k}>{KIND_LABEL[k]}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="pr-from">Nuo</Label>
            <Input id="pr-from" type="date" value={form.date_from} onChange={(e) => setForm({ ...form, date_from: e.target.value })} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="pr-to">Iki ir įskaitant</Label>
            <Input id="pr-to" type="date" value={form.date_to} onChange={(e) => setForm({ ...form, date_to: e.target.value })} />
          </div>
        </div>
        <div className="flex flex-wrap items-end gap-4">
          <div className="flex gap-4 text-sm">
            <label className="flex items-center gap-2">
              <input type="radio" name="pr-mode" checked={form.mode === "multiplier"} onChange={() => setForm({ ...form, mode: "multiplier" })} />
              Daugiklis (%)
            </label>
            <label className="flex items-center gap-2">
              <input type="radio" name="pr-mode" checked={form.mode === "fixed"} onChange={() => setForm({ ...form, mode: "fixed" })} />
              Tiksli kaina (€)
            </label>
          </div>
          {form.mode === "multiplier" ? (
            <div className="space-y-1">
              <Label htmlFor="pr-mult">Daugiklis</Label>
              <Input id="pr-mult" className="w-32" type="number" step="0.01" min={0} value={form.multiplier} onChange={(e) => setForm({ ...form, multiplier: e.target.value })} />
            </div>
          ) : (
            <div className="space-y-1">
              <Label htmlFor="pr-fixed">Kaina už naktį (€)</Label>
              <Input id="pr-fixed" className="w-32" type="number" step="0.01" min={0} value={form.fixed_price} onChange={(e) => setForm({ ...form, fixed_price: e.target.value })} />
            </div>
          )}
          <div className="space-y-1">
            <Label>Spalva</Label>
            <div className="flex items-center gap-1">
              {PALETTE.map((c) => (
                <button
                  key={c}
                  type="button"
                  aria-label={`Spalva ${c}`}
                  onClick={() => setForm({ ...form, color: c })}
                  className={`h-7 w-7 rounded-full border-2 ${form.color === c ? "border-foreground" : "border-transparent"}`}
                  style={{ backgroundColor: c }}
                />
              ))}
              <input type="color" aria-label="Kita spalva" value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} className="h-7 w-9 cursor-pointer rounded border bg-background" />
            </div>
          </div>
          <div className="space-y-1">
            <Label htmlFor="pr-prio">Prioritetas</Label>
            <Input id="pr-prio" className="w-24" type="number" value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })} />
          </div>
        </div>
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-sm font-medium">
            <input type="checkbox" checked={applyAll} onChange={(e) => setApplyAll(e.target.checked)} />
            Taikyti visiems objektams ({properties.length})
          </label>
          {!applyAll && (
            <div className="flex flex-wrap gap-2">
              {properties.map((p) => {
                const on = targets.includes(p.id);
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setTargets((t) => (on ? t.filter((x) => x !== p.id) : [...t, p.id]))}
                    className={`rounded-full border px-3 py-1 text-xs ${on ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground"}`}
                  >
                    {p.name}
                  </button>
                );
              })}
            </div>
          )}
        </div>
        <Button disabled={!formValid || saveBulk.isPending} onClick={() => saveBulk.mutate()}>
          <Plus className="mr-1 h-4 w-4" />
          {saveBulk.isPending ? "Saugoma…" : "Pridėti taisyklę"}
        </Button>
      </section>

      {/* Taisyklių sąrašas */}
      <section className="space-y-3 rounded-xl border bg-card p-6">
        <h2 className="text-lg font-semibold">
          Taisyklės {propertyId ? `— ${propName(propertyId)}` : "— visi objektai"}
        </h2>
        {rulesQ.isLoading ? (
          <p className="text-sm text-muted-foreground">Kraunama…</p>
        ) : rules.length === 0 ? (
          <p className="text-sm text-muted-foreground">Taisyklių dar nėra.</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left text-xs text-muted-foreground">
                <tr>
                  <th className="p-2">Pavadinimas</th>
                  <th className="p-2">Objektas</th>
                  <th className="p-2">Tipas</th>
                  <th className="p-2">Nuo – iki</th>
                  <th className="p-2">Pakeitimas</th>
                  <th className="p-2">Prioritetas</th>
                  <th className="p-2" />
                </tr>
              </thead>
              <tbody>
                {rules.map((r) => (
                  <tr key={r.id} className="border-t">
                    <td className="p-2 font-medium">
                      <span className="flex items-center gap-2">
                        <span className="h-3 w-3 shrink-0 rounded-full border" style={{ backgroundColor: r.color ?? "#f59e0b" }} />
                        {r.label}
                      </span>
                    </td>
                    <td className="p-2">{propName(r.property_id)}</td>
                    <td className="p-2">{KIND_LABEL[r.kind as Kind]}</td>
                    <td className="p-2 whitespace-nowrap">{r.date_from} – {r.date_to}</td>
                    <td className="p-2 whitespace-nowrap">
                      {r.fixed_price != null ? `${Number(r.fixed_price).toFixed(2)} €` : `×${Number(r.multiplier).toFixed(2)}`}
                    </td>
                    <td className="p-2">{r.priority}</td>
                    <td className="p-2 text-right">
                      <Button variant="ghost" size="icon" aria-label="Ištrinti" onClick={() => setToDelete(r)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Objektų būsena */}
      <section className="space-y-3 rounded-xl border bg-card p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">Objektų būsena</h2>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={toggle.isPending || !properties.length}
              onClick={() => toggle.mutate({ ids: properties.map((p) => p.id), enabled: true })}
            >
              Įjungti visiems
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={toggle.isPending || !properties.length}
              onClick={() => toggle.mutate({ ids: properties.map((p) => p.id), enabled: false })}
            >
              Išjungti visiems
            </Button>
          </div>
        </div>
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left text-xs text-muted-foreground">
              <tr>
                <th className="p-2">Objektas</th>
                <th className="p-2">Bazinė kaina</th>
                <th className="p-2">Min.</th>
                <th className="p-2">Maks.</th>
                <th className="p-2">Užimtumo taisyklės</th>
                <th className="p-2">Dinaminė kaina</th>
              </tr>
            </thead>
            <tbody>
              {properties.map((p) => (
                <tr key={p.id} className="border-t">
                  <td className="p-2 font-medium">{p.name}</td>
                  <td className="p-2">{p.base.toFixed(2)} €</td>
                  <td className="p-2">{p.min != null ? `${p.min.toFixed(2)} €` : "—"}</td>
                  <td className="p-2">{p.max != null ? `${p.max.toFixed(2)} €` : "—"}</td>
                  <td className="p-2">{p.tiers.length || "—"}</td>
                  <td className="p-2">
                    <Switch
                      checked={p.enabled}
                      disabled={toggle.isPending}
                      onCheckedChange={(c) => toggle.mutate({ ids: [p.id], enabled: c })}
                      aria-label={`Dinaminė kaina: ${p.name}`}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-muted-foreground">
          Norėdami keisti objekto kainų ribas ir užimtumo taisykles, viršuje pasirinkite objektą.
        </p>
      </section>

      {propertyId && (
        <section className="rounded-xl border bg-card p-6">
          <h2 className="mb-2 text-lg font-semibold">Objekto nustatymai — {propName(propertyId)}</h2>
          <DynamicPricingPanel key={propertyId} propertyId={propertyId} />
        </section>
      )}

      <AlertDialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Ištrinti taisyklę?</AlertDialogTitle>
            <AlertDialogDescription>
              {toDelete ? `„${toDelete.label}" (${toDelete.date_from} – ${toDelete.date_to}) bus pašalinta.` : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Atšaukti</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (toDelete) delRow.mutate(toDelete.id);
                setToDelete(null);
              }}
            >
              Ištrinti
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
