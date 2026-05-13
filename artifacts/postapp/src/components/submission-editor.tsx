import { useSubmissionStore, SubmissionFields } from "@/state/submission-store";
import { FieldRow } from "@/components/field-row";
import { PricingEditor } from "@/components/pricing-editor";
import { Button } from "@/components/ui/button";
import { getFieldStatus } from "@/utils/source-sync";
import {
  FileText,
  Cpu,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  RefreshCw,
  ChevronsDown,
  RotateCcw,
  Sparkles,
  Loader2,
} from "lucide-react";
import { useMemo, useState } from "react";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

// ── AI Auto-Fill button ────────────────────────────────────────────────────
function AIFillButton() {
  const { fields, syncDetected } = useSubmissionStore();
  const [state, setState] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const run = async () => {
    if (!fields.appName) {
      setErrorMsg("Enter an App Name first so the AI knows what it's writing for.");
      setState("error");
      return;
    }
    setState("loading");
    setErrorMsg(null);
    try {
      const res = await fetch(`${BASE}/api/apple/ai-fill`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          appName: fields.appName,
          appUrl: fields.supportUrl || "",
          category: fields.category || "",
          existingDescription: fields.description || "",
        }),
      });
      const data = await res.json() as { ok?: boolean; fields?: Record<string, string>; error?: string };
      if (!data.ok || !data.fields) throw new Error(data.error ?? "AI fill returned no data");
      syncDetected(data.fields as never);
      setState("done");
      setTimeout(() => setState("idle"), 4000);
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : "AI fill failed");
      setState("error");
      setTimeout(() => setState("idle"), 5000);
    }
  };

  const label = {
    idle:    "AI Auto-Fill",
    loading: "Generating…",
    done:    "Fields filled!",
    error:   errorMsg ?? "Error",
  }[state];

  const icon = {
    idle:    <Sparkles className="h-3 w-3" />,
    loading: <Loader2 className="h-3 w-3 animate-spin" />,
    done:    <CheckCircle2 className="h-3 w-3" />,
    error:   <AlertTriangle className="h-3 w-3" />,
  }[state];

  const cls = {
    idle:    "bg-violet-600/20 border-violet-500/40 text-violet-300 hover:bg-violet-600/30 hover:border-violet-500/60",
    loading: "bg-violet-600/10 border-violet-500/20 text-violet-400/60 cursor-not-allowed",
    done:    "bg-green-600/20 border-green-500/40 text-green-300",
    error:   "bg-red-600/10 border-red-500/30 text-red-400",
  }[state];

  return (
    <button
      onClick={run}
      disabled={state === "loading"}
      title="Uses GPT-4o to write your subtitle, description, keywords, and What's New"
      className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-[11px] font-mono font-semibold uppercase tracking-wider border transition-all ${cls}`}
    >
      {icon}
      {label}
    </button>
  );
}

type FieldKey = keyof SubmissionFields;

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
];

const STATUS_CONFIG = [
  { key: "verified" as const, icon: CheckCircle2, label: "Verified", color: "text-green-400" },
  { key: "manual" as const, icon: Clock, label: "Manual", color: "text-blue-400" },
  { key: "modified" as const, icon: AlertTriangle, label: "Modified", color: "text-amber-400" },
  { key: "missing" as const, icon: XCircle, label: "Missing", color: "text-red-400" },
] as const;

function ReadinessBar() {
  const { fields, detected, getCompletionStats } = useSubmissionStore();
  const stats = getCompletionStats();

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    FIELDS.forEach(({ fieldKey }) => {
      const s = getFieldStatus(fields[fieldKey], detected[fieldKey]);
      counts[s] = (counts[s] ?? 0) + 1;
    });
    return counts;
  }, [fields, detected]);

  return (
    <div className="rounded-xl border border-border/50 bg-muted/10 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Cpu className="h-3.5 w-3.5 text-primary" />
          <span className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
            Field Readiness
          </span>
        </div>
        <span className="text-xs font-mono font-bold text-primary">{stats.percent}%</span>
      </div>

      <div className="w-full h-2 bg-muted/40 rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-primary to-blue-400 transition-all duration-500 rounded-full"
          style={{ width: `${stats.percent}%` }}
        />
      </div>

      <div className="flex flex-wrap gap-3">
        {STATUS_CONFIG.filter(({ key }) => (statusCounts[key] ?? 0) > 0).map(
          ({ key, icon: Icon, label, color }) => (
            <span key={key} className={`inline-flex items-center gap-1 text-[11px] font-mono ${color}`}>
              <Icon className="h-3 w-3" />
              {statusCounts[key]} {label}
            </span>
          ),
        )}
      </div>
    </div>
  );
}

interface SubmissionEditorProps {
  onSave?: () => void;
  isSaving?: boolean;
  onReset?: () => void;
}

export function SubmissionEditor({ onSave, isSaving, onReset }: SubmissionEditorProps) {
  const { applyAllDetectedValues } = useSubmissionStore();

  return (
    <div className="space-y-6">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        {/* AI Auto-Fill — hero action */}
        <AIFillButton />

        <div className="w-px h-5 bg-border/40 mx-0.5" />

        <button
          onClick={applyAllDetectedValues}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-[11px] font-mono font-semibold uppercase tracking-wider bg-muted/30 border border-border/50 text-muted-foreground hover:text-foreground hover:border-border transition-colors"
          data-testid="btn-apply-all"
        >
          <ChevronsDown className="h-3 w-3" />
          Apply All Detected
        </button>
        {onReset && (
          <button
            onClick={onReset}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-[11px] font-mono font-semibold uppercase tracking-wider bg-muted/20 border border-border/40 text-muted-foreground hover:text-foreground hover:border-border transition-colors"
            data-testid="btn-reset-saved"
          >
            <RotateCcw className="h-3 w-3" />
            Reset to Saved
          </button>
        )}
      </div>

      <ReadinessBar />

      {/* Metadata fields */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <FileText className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
            App Store Metadata
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {FIELDS.map((f) => (
            <FieldRow key={f.fieldKey} {...f} />
          ))}
        </div>

        <FieldRow
          fieldKey="description"
          label="Description"
          placeholder="What your app does, written for App Store customers..."
          multiline
        />
      </div>

      <PricingEditor />

      {onSave && (
        <div className="flex justify-end pt-2 border-t border-border">
          <Button
            onClick={onSave}
            disabled={isSaving}
            className="w-full sm:w-auto font-mono text-xs uppercase tracking-wider"
          >
            {isSaving ? "Saving…" : "Save to App"}
          </Button>
        </div>
      )}
    </div>
  );
}
