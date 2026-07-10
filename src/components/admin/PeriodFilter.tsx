import { useState } from "react";
import { Calendar as CalendarIcon } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  PERIOD_KEYS,
  PERIOD_LABELS,
  formatPeriodLabel,
  resolvePeriod,
  type PeriodKey,
  type ResolvedRange,
} from "@/lib/dashboard-period";

export function PeriodFilter({
  value,
  onChange,
}: {
  value: { period: PeriodKey; from?: string | null; to?: string | null };
  onChange: (v: { period: PeriodKey; from?: string | null; to?: string | null; range: ResolvedRange }) => void;
}) {
  const [open, setOpen] = useState(false);
  const range = resolvePeriod(value.period, value.from, value.to);
  const label = formatPeriodLabel(value.period, range);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button className="inline-flex items-center gap-2 rounded-md border bg-card px-3 py-2 text-sm shadow-sm hover:bg-accent">
          <CalendarIcon className="h-4 w-4" />
          <span>{label}</span>
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-64 p-2">
        <div className="flex flex-col">
          {PERIOD_KEYS.filter((k) => k !== "custom").map((k) => (
            <button
              key={k}
              className={`rounded px-2 py-1.5 text-left text-sm hover:bg-accent ${
                value.period === k ? "bg-accent font-medium" : ""
              }`}
              onClick={() => {
                const r = resolvePeriod(k);
                onChange({ period: k, from: r.from, to: r.to, range: r });
                setOpen(false);
              }}
            >
              {PERIOD_LABELS[k]}
            </button>
          ))}
          <div className="mt-2 border-t pt-2">
            <label className="block text-xs text-muted-foreground">Nuo</label>
            <input
              type="date"
              value={value.from ?? ""}
              onChange={(e) => {
                const from = e.target.value || null;
                const to = value.to ?? null;
                const r: ResolvedRange = { from, to };
                onChange({ period: "custom", from, to, range: r });
              }}
              className="mt-1 w-full rounded border bg-background px-2 py-1 text-sm"
            />
            <label className="mt-2 block text-xs text-muted-foreground">Iki</label>
            <input
              type="date"
              value={value.to ?? ""}
              onChange={(e) => {
                const to = e.target.value || null;
                const from = value.from ?? null;
                const r: ResolvedRange = { from, to };
                onChange({ period: "custom", from, to, range: r });
              }}
              className="mt-1 w-full rounded border bg-background px-2 py-1 text-sm"
            />
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
