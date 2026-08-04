import { CONTENT_VARIABLES } from "@/lib/content-templates";
import { Badge } from "@/components/ui/badge";

export function VariablePicker({
  onInsert,
  disabled,
}: {
  onInsert: (token: string) => void;
  disabled?: boolean;
}) {
  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-muted-foreground">
        Palaikomi kintamieji — spustelėkite, kad įterptumėte
      </p>
      <div className="flex flex-wrap gap-1.5">
        {CONTENT_VARIABLES.map((v) => (
          <button
            key={v.token}
            type="button"
            disabled={disabled}
            title={v.label}
            onClick={() => onInsert(v.token)}
            className="disabled:opacity-50"
          >
            <Badge variant="secondary" className="cursor-pointer font-mono text-[11px] font-normal">
              {v.token}
            </Badge>
          </button>
        ))}
      </div>
    </div>
  );
}