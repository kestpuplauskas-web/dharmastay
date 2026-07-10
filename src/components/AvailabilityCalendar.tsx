import * as React from "react";
import { format } from "date-fns";
import { lt as ltLocale, enUS } from "date-fns/locale";
import type { DateRange, DayButtonProps } from "react-day-picker";
import { useTranslation } from "react-i18next";

import { Calendar, CalendarDayButton } from "@/components/ui/calendar";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

export type DayAvailability = { total: number; booked: number; free: number };
export type AvailabilityMap = Record<string, DayAvailability>;

type Props = {
  value: { from?: Date; to?: Date };
  onChange: (range: { from?: Date; to?: Date }) => void;
  availability: AvailabilityMap;
  className?: string;
};

const AvailabilityCtx = React.createContext<AvailabilityMap>({});

function startOfDay(d: Date) {
  const c = new Date(d);
  c.setHours(0, 0, 0, 0);
  return c;
}

function fmtKey(d: Date) {
  return format(startOfDay(d), "yyyy-MM-dd");
}

function CustomDayButton(props: DayButtonProps) {
  const availability = React.useContext(AvailabilityCtx);
  const key = fmtKey(props.day.date);
  const info = availability[key];
  const label =
    info && info.total > 0
      ? info.free === 0
        ? "—"
        : String(info.free)
      : "";
  return (
    <div className="relative h-full w-full">
      <CalendarDayButton {...props} />
      {label && (
        <span
          className={cn(
            "pointer-events-none absolute inset-x-0 -bottom-0.5 text-center text-[9px] leading-none font-medium",
            info!.free === 0
              ? "text-muted-foreground"
              : info!.free <= Math.max(1, Math.floor(info!.total * 0.3))
                ? "text-amber-600"
                : "text-emerald-600",
          )}
        >
          {label}
        </span>
      )}
    </div>
  );
}

export function AvailabilityCalendar({ value, onChange, availability, className }: Props) {
  const isMobile = useIsMobile();
  const { t, i18n } = useTranslation();
  const dateLocale = i18n.language?.startsWith("en") ? enUS : ltLocale;
  const today = startOfDay(new Date());

  const { fullDays, lowDays, goodDays } = React.useMemo(() => {
    const full: Date[] = [];
    const low: Date[] = [];
    const good: Date[] = [];
    for (const [k, v] of Object.entries(availability)) {
      if (v.total <= 0) continue;
      const d = new Date(k + "T00:00:00");
      if (v.free === 0) full.push(d);
      else if (v.free <= Math.max(1, Math.floor(v.total * 0.3))) low.push(d);
      else good.push(d);
    }
    return { fullDays: full, lowDays: low, goodDays: good };
  }, [availability]);

  const range: DateRange | undefined = value.from ? { from: value.from, to: value.to } : undefined;

  const rangeCrossesFull = (from: Date, to: Date) => {
    for (let d = new Date(startOfDay(from)); d <= startOfDay(to); d.setDate(d.getDate() + 1)) {
      const info = availability[fmtKey(d)];
      if (info && info.total > 0 && info.free === 0) return true;
    }
    return false;
  };

  const handleSelect = (_next: DateRange | undefined, selectedDay: Date | undefined) => {
    if (!selectedDay) return;
    const day = startOfDay(selectedDay);
    if (!value.from || (value.from && value.to)) {
      onChange({ from: day, to: undefined });
      return;
    }
    if (day.getTime() === value.from.getTime()) {
      onChange({ from: value.from, to: day });
      return;
    }
    if (day < value.from) {
      onChange({ from: day, to: undefined });
      return;
    }
    if (rangeCrossesFull(value.from, day)) {
      onChange({ from: day, to: undefined });
      return;
    }
    onChange({ from: value.from, to: day });
  };

  return (
    <AvailabilityCtx.Provider value={availability}>
      <div className={className}>
        <Calendar
          mode="range"
          selected={range}
          onSelect={handleSelect}
          numberOfMonths={isMobile ? 1 : 2}
          showOutsideDays={false}
          locale={dateLocale}
          disabled={(d) => {
            if (d < today) return true;
            const info = availability[fmtKey(d)];
            return !!(info && info.total > 0 && info.free === 0);
          }}
          modifiers={{ full: fullDays, low: lowDays, good: goodDays }}
          modifiersClassNames={{
            full: "bg-muted/60",
            low: "bg-amber-50",
            good: "bg-emerald-50",
          }}
          components={{ DayButton: CustomDayButton }}
          className="p-3 pointer-events-auto mx-auto [--cell-size:2.6rem]"
          classNames={{
            range_start:
              "!rounded-md [&_button]:!bg-primary [&_button]:!text-primary-foreground hover:[&_button]:!bg-primary",
            range_end:
              "!rounded-md [&_button]:!bg-primary [&_button]:!text-primary-foreground hover:[&_button]:!bg-primary",
            range_middle:
              "!bg-primary/15 !text-foreground !rounded-none [&_button]:!bg-transparent [&_button]:!text-foreground",
            today: "!bg-transparent [&_button]:ring-1 [&_button]:ring-primary",
            disabled: "!text-muted-foreground !opacity-50 pointer-events-none",
          }}
        />
        <div className="mt-4 flex flex-wrap items-center justify-center gap-4 text-xs text-muted-foreground">
          <LegendDot className="bg-emerald-200" label={t("home.calendar.legendFree")} />
          <LegendDot className="bg-amber-200" label={t("home.calendar.legendLow")} />
          <LegendDot className="bg-muted" label={t("home.calendar.legendFull")} />
        </div>
      </div>
    </AvailabilityCtx.Provider>
  );
}

function LegendDot({ className, label }: { className: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={cn("h-3 w-3 rounded-sm border border-border", className)} />
      {label}
    </span>
  );
}
