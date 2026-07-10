import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Info, type LucideIcon } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

export interface KpiInfo {
  what: string;
  formula?: string;
  source?: string;
  period?: string;
}

interface KpiCardProps {
  label: string;
  value: string;
  icon?: LucideIcon;
  sub?: string;
  tone?: "default" | "warning" | "success" | "danger";
  info?: KpiInfo;
}

const toneStyle: Record<NonNullable<KpiCardProps["tone"]>, string> = {
  default: "text-foreground",
  warning: "text-amber-600",
  success: "text-emerald-600",
  danger: "text-rose-600",
};

function InfoContent({ info }: { info: KpiInfo }) {
  return (
    <div className="space-y-2 text-xs leading-relaxed">
      <div>
        <div className="font-semibold text-foreground mb-0.5">Ką rodo</div>
        <div className="text-muted-foreground">{info.what}</div>
      </div>
      {info.formula ? (
        <div>
          <div className="font-semibold text-foreground mb-0.5">Formulė</div>
          <div className="text-muted-foreground font-mono text-[11px]">
            {info.formula}
          </div>
        </div>
      ) : null}
      {info.source ? (
        <div>
          <div className="font-semibold text-foreground mb-0.5">Duomenys</div>
          <div className="text-muted-foreground">{info.source}</div>
        </div>
      ) : null}
      {info.period ? (
        <div>
          <div className="font-semibold text-foreground mb-0.5">Laikotarpis</div>
          <div className="text-muted-foreground">{info.period}</div>
        </div>
      ) : null}
    </div>
  );
}

function InfoIcon({ info }: { info: KpiInfo }) {
  return (
    <TooltipProvider delayDuration={150}>
      <Popover>
        <Tooltip>
          <PopoverTrigger asChild>
            <TooltipTrigger asChild>
              <button
                type="button"
                aria-label="Daugiau informacijos"
                className="text-muted-foreground/70 hover:text-foreground transition-colors -m-1 p-1 rounded"
                onClick={(e) => e.stopPropagation()}
              >
                <Info className="h-3.5 w-3.5" />
              </button>
            </TooltipTrigger>
          </PopoverTrigger>
          <TooltipContent side="top" align="end" className="max-w-[260px] p-3 bg-popover text-popover-foreground border border-border shadow-sm">
            <InfoContent info={info} />
          </TooltipContent>
        </Tooltip>
        <PopoverContent side="top" align="end" className="w-[260px] p-3">
          <InfoContent info={info} />
        </PopoverContent>
      </Popover>
    </TooltipProvider>
  );
}

export function KpiCard({ label, value, icon: Icon, sub, tone = "default", info }: KpiCardProps) {
  return (
    <Card className="border-border/60">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-2">
          <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {label}
          </div>
          <div className="flex items-center gap-1.5">
            {Icon ? <Icon className="h-4 w-4 text-muted-foreground" /> : null}
            {info ? <InfoIcon info={info} /> : null}
          </div>
        </div>
        <div
          className={cn(
            "mt-2 text-3xl font-bold tabular-nums leading-tight",
            toneStyle[tone],
          )}
        >
          {value}
        </div>
        {sub ? (
          <div className="mt-1 text-xs text-muted-foreground">{sub}</div>
        ) : null}
      </CardContent>
    </Card>
  );
}
