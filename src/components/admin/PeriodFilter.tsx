import * as React from "react";
import { Calendar as CalendarIcon, Check } from "lucide-react";
import type { DateRange } from "react-day-picker";
import { lt as ltLocale } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import {
  PERIOD_KEYS,
  PERIOD_LABELS,
  type PeriodKey,
  resolvePeriod,
  formatPeriodLabel,
} from "@/lib/dashboard-period";

type Props = {
  period: PeriodKey;
  from?: string;
  to?: string;
  onChange: (next: { period: PeriodKey; from?: string; to?: string }) => void;
};

function toLocalISO(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function startOfDay(d: Date) {
  const c = new Date(d);
  c.setHours(0, 0, 0, 0);
  return c;
}

export function PeriodFilter({ period, from, to, onChange }: Props) {
  const [open, setOpen] = React.useState(false);
  const [showCustom, setShowCustom] = React.useState(period === "custom");
  const [pendingFrom, setPendingFrom] = React.useState<Date | undefined>(
    from ? new Date(from + "T00:00:00") : undefined,
  );
  const [pendingTo, setPendingTo] = React.useState<Date | undefined>(
    to ? new Date(to + "T00:00:00") : undefined,
  );
  const isMobile = useIsMobile();

  const range = resolvePeriod(period, from, to);
  const label = formatPeriodLabel(period, range);

  React.useEffect(() => {
    if (!open) {
      setShowCustom(period === "custom");
      setPendingFrom(from ? new Date(from + "T00:00:00") : undefined);
      setPendingTo(to ? new Date(to + "T00:00:00") : undefined);
    }
  }, [open, period, from, to]);

  const handlePick = (k: PeriodKey) => {
    if (k === "custom") {
      setShowCustom(true);
      return;
    }
    onChange({ period: k, from: undefined, to: undefined });
    setOpen(false);
  };

  const handleSelectDay = (day: Date | undefined) => {
    if (!day) return;
    const d = startOfDay(day);
    // pradžia naujo pasirinkimo arba pilnas intervalas yra → restart
    if (!pendingFrom || (pendingFrom && pendingTo)) {
      setPendingFrom(d);
      setPendingTo(undefined);
      return;
    }
    // turim NUO, dedam IKI
    if (d < pendingFrom) {
      setPendingFrom(d);
      setPendingTo(undefined);
      return;
    }
    setPendingTo(d);
    onChange({ period: "custom", from: toLocalISO(pendingFrom), to: toLocalISO(d) });
    setOpen(false);
  };

  const selectedRange: DateRange | undefined = pendingFrom
    ? { from: pendingFrom, to: pendingTo }
    : undefined;

  const summary = pendingFrom
    ? `${toLocalISO(pendingFrom)} → ${pendingTo ? toLocalISO(pendingTo) : "…"}`
    : "Pasirinkite NUO datą";

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <CalendarIcon className="h-4 w-4" />
          <span className="truncate max-w-[260px]">{label}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className={cn("p-2", showCustom ? "w-auto" : "w-[320px]")}
      >
        {!showCustom ? (
          <div className="flex flex-col">
            {PERIOD_KEYS.map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => handlePick(k)}
                className={cn(
                  "flex items-center justify-between px-3 py-2 text-sm rounded-md hover:bg-muted text-left",
                  period === k && "bg-muted font-medium",
                )}
              >
                <span>{PERIOD_LABELS[k]}</span>
                {period === k && <Check className="h-4 w-4" />}
              </button>
            ))}
          </div>
        ) : (
          <div className="flex flex-col">
            <div className="flex items-center justify-between px-2 pb-2">
              <button
                type="button"
                onClick={() => setShowCustom(false)}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                ← Atgal
              </button>
              <div className="text-sm font-medium">{summary}</div>
            </div>
            <Calendar
              mode="range"
              selected={selectedRange}
              onDayClick={handleSelectDay}
              numberOfMonths={isMobile ? 1 : 2}
              showOutsideDays={false}
              locale={ltLocale}
              initialFocus
              className="p-3 pointer-events-auto"
              classNames={{
                range_start:
                  "!rounded-full [&_button]:!bg-primary [&_button]:!text-primary-foreground [&_button]:!rounded-full hover:[&_button]:!bg-primary",
                range_end:
                  "!rounded-full [&_button]:!bg-primary [&_button]:!text-primary-foreground [&_button]:!rounded-full hover:[&_button]:!bg-primary",
                range_middle:
                  "!bg-primary/15 !text-foreground !rounded-none [&_button]:!bg-transparent [&_button]:!text-foreground [&_button]:!rounded-none hover:[&_button]:!bg-primary/25",
              }}
            />
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
