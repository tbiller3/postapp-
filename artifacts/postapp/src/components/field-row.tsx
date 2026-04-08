import { useSubmissionStore, SubmissionData } from "@/state/submission-store";
import {
  verifyField,
  VERIFICATION_LABELS,
  VERIFICATION_STYLES,
} from "@/utils/verification-engine";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { CheckCircle2, AlertTriangle, Clock, XCircle, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

type FieldKey = keyof Omit<SubmissionData, "pricing">;

interface FieldRowProps {
  label: string;
  fieldKey: FieldKey;
  placeholder?: string;
  multiline?: boolean;
  hint?: string;
}

const VERIFICATION_ICONS = {
  missing: XCircle,
  "needs-review": Clock,
  complete: CheckCircle2,
  mismatch: AlertTriangle,
};

export function FieldRow({ label, fieldKey, placeholder, multiline = false, hint }: FieldRowProps) {
  const { data, detected, setField, useDetectedValue } = useSubmissionStore();

  const current = String(data[fieldKey] ?? "");
  const detectedVal = detected[fieldKey] ? String(detected[fieldKey]) : "";
  const status = verifyField(current, detectedVal);
  const Icon = VERIFICATION_ICONS[status];

  return (
    <div className="rounded-xl border border-border/60 bg-background/30 p-4 space-y-3 transition-colors hover:border-border">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-0.5 flex-1 min-w-0">
          <p className="text-xs font-mono font-semibold uppercase tracking-wider text-muted-foreground">
            {label}
          </p>
          {detectedVal ? (
            <p className="text-[11px] font-mono text-muted-foreground/70 truncate">
              Detected:{" "}
              <code className="text-primary/60 bg-primary/5 px-1 rounded">
                {detectedVal}
              </code>
            </p>
          ) : (
            <p className="text-[11px] font-mono text-muted-foreground/40 italic">
              No detected value
            </p>
          )}
        </div>
        <span
          className={cn(
            "inline-flex items-center gap-1 shrink-0 px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold uppercase tracking-wider border",
            VERIFICATION_STYLES[status],
          )}
        >
          <Icon className="h-2.5 w-2.5" />
          {VERIFICATION_LABELS[status]}
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

      {detectedVal && current !== detectedVal && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => useDetectedValue(fieldKey)}
          className="h-7 text-[11px] font-mono px-2 gap-1 text-primary/70 hover:text-primary hover:bg-primary/5"
        >
          <Zap className="h-3 w-3" />
          Use detected value
        </Button>
      )}
    </div>
  );
}
