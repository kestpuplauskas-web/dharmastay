import * as React from "react";
import { format } from "date-fns";
import { useTranslation } from "react-i18next";
import { Calendar as CalendarIcon } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { AvailabilityCalendar, type AvailabilityMap } from "@/components/AvailabilityCalendar";
import { cn } from "@/lib/utils";

type Props = {
  value: { from?: Date; to?: Date };
  onChange: (range: { from?: Date; to?: Date }) => void;
  availability: AvailabilityMap;
  className?: string;
};

export function AvailabilityDatePicker({ value, onChange, availability, className }: Props) {
  const { t } = useTranslation();
  const [open, setOpen] = React.useState(false);

  const handleChange = (range: { from?: Date; to?: Date }) => {
    onChange(range);
    if (range.from && range.to) {
      setOpen(false);
    }
  };

  const triggerLabel = value.from && value.to
    ? `${format(value.from, "yyyy-MM-dd")} → ${format(value.to, "yyyy-MM-dd")}`
    : value.from
    ? `${format(value.from, "yyyy-MM-dd")} → …`
    : t("detail.selectLocationDates");


  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "w-full flex items-center gap-3 rounded-2xl border border-border/60 bg-card px-5 py-3.5 text-left text-sm font-medium hover:border-primary/50 transition shadow-sm",
            !value.from && "text-muted-foreground font-normal",
            className,
          )}
        >
          <CalendarIcon className="h-5 w-5 shrink-0 text-muted-foreground" />
          <span className="truncate">{triggerLabel}</span>
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="center" sideOffset={8}>
        <AvailabilityCalendar
          value={value}
          onChange={handleChange}
          availability={availability}
          className="p-4"
        />
      </PopoverContent>
    </Popover>
  );
}
