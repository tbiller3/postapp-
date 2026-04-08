import { useSubmissionStore } from "@/state/submission-store";
import { FieldRow } from "@/components/field-row";
import { PricingEditor } from "@/components/pricing-editor";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { verifyField, VerificationState } from "@/utils/verification-engine";
import { FileText, Cpu, CheckCircle2, XCircle, Clock, AlertTriangle } from "lucide-react";
import { useMemo } from "react";

type FieldKey = keyof Omit<ReturnType<typeof useSubmissionStore.getState>["data"], "pricing">;

const FIELDS: Array<{
  label: string;
  fieldKey: FieldKey;
  placeholder: string;
  multiline?: boolean;
  hint?: string;
}> = [
  { label: "App Name", fieldKey: "appName", placeholder: "Your app's name on the App Store" },
  { label: "Subtitle", fieldKey: "subtitle", placeholder: "Short tagline (max 30 chars)" },
  { label: "Bundle ID", fieldKey: "bundleId", placeholder: "com.example.myapp" },
  { label: "Version", fieldKey: "version", placeholder: "1.0.0" },
  { label: "Build Number", fieldKey: "buildNumber", placeholder: "42", hint: "Must be unique per upload — increment by 1 each time." },
  { label: "Category", fieldKey: "category", placeholder: "e.g. Productivity, Developer Tools" },
  { label: "Age Rating", fieldKey: "ageRating", placeholder: "4+, 9+, 12+, or 17+" },
  { label: "Keywords", fieldKey: "keywords", placeholder: "comma,separated,keywords (max 100 chars)", hint: "Do not repeat your app name. Use the full 100 characters." },
  { label: "Support URL", fieldKey: "supportUrl", placeholder: "https://yoursite.com/support" },
  { label: "Privacy Policy URL", fieldKey: "privacyPolicyUrl", placeholder: "https://yoursite.com/privacy", hint: "Must be a live, publicly accessible URL that reviewers can open." },
  { label: "Description", fieldKey: "description", placeholder: "What your app does, written for App Store customers...", multiline: true },
];

function ReadinessBar() {
  const { data, detected } = useSubmissionStore();

  const statuses: VerificationState[] = useMemo(
    () =>
      FIELDS.map(({ fieldKey }) =>
        verifyField(
          String(data[fieldKey] ?? ""),
          detected[fieldKey] ? String(detected[fieldKey]) : "",
        ),
      ),
    [data, detected],
  );

  const counts = statuses.reduce(
    (acc, s) => {
      acc[s] = (acc[s] ?? 0) + 1;
      return acc;
    },
    {} as Record<VerificationState, number>,
  );

  const complete = counts.complete ?? 0;
  const total = FIELDS.length;
  const pct = Math.round((complete / total) * 100);

  return (
    <div className="rounded-xl border border-border/50 bg-muted/10 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Cpu className="h-3.5 w-3.5 text-primary" />
          <span className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
            Field Readiness
          </span>
        </div>
        <span className="text-xs font-mono font-bold text-primary">{pct}%</span>
      </div>

      <div className="w-full h-1.5 bg-muted/40 rounded-full overflow-hidden">
        <div
          className="h-full bg-primary transition-all duration-500 rounded-full"
          style={{ width: `${pct}%` }}
        />
      </div>

      <div className="flex flex-wrap gap-2">
        {(
          [
            { state: "complete" as const, icon: CheckCircle2, label: "Complete", style: "text-green-400" },
            { state: "needs-review" as const, icon: Clock, label: "Needs Review", style: "text-blue-400" },
            { state: "mismatch" as const, icon: AlertTriangle, label: "Mismatch", style: "text-amber-400" },
            { state: "missing" as const, icon: XCircle, label: "Missing", style: "text-red-400" },
          ] as const
        )
          .filter(({ state }) => (counts[state] ?? 0) > 0)
          .map(({ state, icon: Icon, label, style }) => (
            <span key={state} className={`inline-flex items-center gap-1 text-[11px] font-mono ${style}`}>
              <Icon className="h-3 w-3" />
              {counts[state]} {label}
            </span>
          ))}
      </div>
    </div>
  );
}

interface SubmissionEditorProps {
  onSave?: () => void;
  isSaving?: boolean;
}

export function SubmissionEditor({ onSave, isSaving }: SubmissionEditorProps) {
  return (
    <div className="space-y-6">
      <ReadinessBar />

      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <FileText className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
            App Store Metadata
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {FIELDS.filter((f) => !f.multiline).map((f) => (
            <FieldRow key={f.fieldKey} {...f} />
          ))}
        </div>

        {FIELDS.filter((f) => f.multiline).map((f) => (
          <FieldRow key={f.fieldKey} {...f} />
        ))}
      </div>

      <PricingEditor />

      {onSave && (
        <div className="flex justify-end pt-2 border-t border-border">
          <Button
            onClick={onSave}
            disabled={isSaving}
            className="font-mono text-xs uppercase tracking-wider"
          >
            {isSaving ? "Saving…" : "Save to App"}
          </Button>
        </div>
      )}
    </div>
  );
}
