import { useSubmissionStore, SubmissionFields } from "@/state/submission-store";
import { getFieldStatus, FIELD_STATUS_LABELS, FIELD_STATUS_STYLES } from "@/utils/source-sync";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { CheckCircle2, AlertTriangle, Clock, XCircle, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

type FieldKey = keyof SubmissionFields;

interface FieldRowProps {
  label: string;
  fieldKey: FieldKey;
  placeholder?: string;
  multiline?: boolean;
  hint?: string;
}

const STATUS_ICONS = {
  missing: XCircle,
  manual: Clock,
  verified: CheckCircle2,
  modified: AlertTriangle,
} as const;

export function FieldRow({ label, fieldKey, placeholder, multiline = false, hint }: FieldRowProps) {
  const { fields, detected, setField, applyDetectedValue } = useSubmissionStore();

  const current = fields[fieldKey] ?? "";
  const detectedVal = detected[fieldKey] ?? "";
  const status = getFieldStatus(current, detectedVal);
  const Icon = STATUS_ICONS[status];
  const showApply = !!detectedVal && current !== detectedVal;

  return (
    <div className="rounded-xl border border-border/60 bg-background/30 p-4 space-y-3 hover:border-border transition-colors">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-0.5 flex-1 min-w-0">
          <p className="text-xs font-mono font-semibold uppercase tracking-wider text-muted-foreground">
            {label}
          </p>
          {detectedVal ? (
            <p className="text-[11px] font-mono text-muted-foreground/70 truncate">
              Detected:{" "}
              <code className="text-blue-400/80 bg-blue-500/5 px-1 rounded">{detectedVal}</code>
            </p>
          ) : (
            <p className="text-[11px] font-mono text-muted-foreground/40 italic">No detected value</p>
          )}
        </div>
        <span
          className={cn(
            "inline-flex items-center gap-1 shrink-0 px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold uppercase tracking-wider border",
            FIELD_STATUS_STYLES[status],
          )}
        >
          <Icon className="h-2.5 w-2.5" />
          {FIELD_STATUS_LABELS[status]}
        </span>
      </div>

      {multiline ? (
        <Textarea
          value={current}
          placeholder={placeholder}
          onChange={(e) => setField(fieldKey, e.target.value)}
          className="min-h-[90px] resize-none font-mono text-sm bg-background/50"
        />
      ) : (
        <Input
          value={current}
          placeholder={placeholder}
          onChange={(e) => setField(fieldKey, e.target.value)}
          className="font-mono text-sm bg-background/50"
        />
      )}

      {hint && (
        <p className="text-[11px] text-muted-foreground/60 leading-relaxed">{hint}</p>
      )}

      {showApply && (
        <button
          onClick={() => applyDetectedValue(fieldKey)}
          className="inline-flex items-center gap-1.5 h-7 px-2 text-[11px] font-mono text-blue-400/70 hover:text-blue-400 hover:bg-blue-500/5 rounded-md transition-colors"
        >
          <Zap className="h-3 w-3" />
          Use detected value
        </button>
      )}
    </div>
  );
}
