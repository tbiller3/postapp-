import { useState, useRef, useCallback } from "react";
import { useAppleConnectStore } from "@/state/apple-connect-store";
import { useSubmissionStore } from "@/state/submission-store";
import {
  Rocket, CheckCircle2, XCircle, Loader2, AlertTriangle,
  Zap, Shield, Link2, FileText, Package, Send, Sparkles,
  ChevronRight, RotateCcw, WifiOff,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

// ── Types ─────────────────────────────────────────────────────────────────
type StepStatus = "idle" | "running" | "done" | "error" | "skipped";

interface PipelineStep {
  id: string;
  label: string;
  icon: React.ElementType;
  description: string;
}

interface StepEvent {
  step: string;
  status: StepStatus;
  message: string;
  ts?: number;
}

const PIPELINE_STEPS: PipelineStep[] = [
  { id: "credentials", label: "Verify Apple Credentials",  icon: Shield,   description: "Confirming your App Store Connect API key is valid" },
  { id: "version",     label: "Prepare Version Slot",      icon: Package,  description: "Finding or creating an open submission version" },
  { id: "metadata",    label: "Push Metadata",             icon: FileText, description: "Syncing your name, description, keywords & URLs to Apple" },
  { id: "build",       label: "Link Build",                icon: Link2,    description: "Attaching your latest processed build to this version" },
  { id: "submit",      label: "Submit for Review",         icon: Send,     description: "Sending your app to Apple's review queue" },
];

// ── Pre-flight check helpers ───────────────────────────────────────────────
function usePreflightChecks() {
  const { status: appleStatus, selectedAppId, builds } = useAppleConnectStore();
  const { fields, getCompletionStats } = useSubmissionStore();
  const stats = getCompletionStats();

  const checks = [
    {
      id: "apple",
      label: "Apple Connect linked",
      pass: appleStatus === "connected",
      fix: "Connect your Apple credentials in the Apple Connect tab",
    },
    {
      id: "app",
      label: "App selected",
      pass: !!selectedAppId,
      fix: "Select your app in the Apple Connect tab",
    },
    {
      id: "metadata",
      label: `Metadata complete (${stats.percent}%)`,
      pass: stats.percent >= 80,
      fix: "Fill in the required fields in the Submission tab",
    },
    {
      id: "description",
      label: "Description written",
      pass: (fields.description?.length ?? 0) >= 20,
      fix: "Add an App Store description in the Submission tab",
    },
    {
      id: "build",
      label: "Build available",
      pass: builds.length > 0,
      fix: "Trigger a build in the Wrap tab — it needs to finish processing in TestFlight first",
      warn: true, // warning, not hard blocker (pipeline can try auto-link)
    },
  ];

  const hardBlocked = checks.filter(c => !c.pass && !c.warn);
  const warnings = checks.filter(c => !c.pass && c.warn);
  const allClear = hardBlocked.length === 0;

  return { checks, hardBlocked, warnings, allClear };
}

// ── Step row ──────────────────────────────────────────────────────────────
function StepRow({ step, status, message }: { step: PipelineStep; status: StepStatus; message?: string }) {
  const Icon = step.icon;

  const statusIcon = () => {
    if (status === "running") return <Loader2 className="h-4 w-4 animate-spin text-violet-400" />;
    if (status === "done")    return <CheckCircle2 className="h-4 w-4 text-green-400" />;
    if (status === "error")   return <XCircle className="h-4 w-4 text-red-400" />;
    if (status === "skipped") return <ChevronRight className="h-4 w-4 text-muted-foreground/40" />;
    return <div className="h-4 w-4 rounded-full border border-border/40" />;
  };

  const rowBg = {
    idle:    "bg-muted/5 border-border/20",
    running: "bg-violet-950/20 border-violet-500/30",
    done:    "bg-green-950/10 border-green-500/20",
    error:   "bg-red-950/20 border-red-500/30",
    skipped: "bg-muted/5 border-border/20 opacity-50",
  }[status];

  return (
    <div className={cn("flex items-start gap-3 px-4 py-3 rounded-xl border transition-all duration-300", rowBg)}>
      <div className="mt-0.5 shrink-0">{statusIcon()}</div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <Icon className={cn("h-3.5 w-3.5 shrink-0", status === "done" ? "text-green-400" : status === "running" ? "text-violet-400" : "text-muted-foreground/40")} />
          <span className={cn("text-xs font-semibold font-mono", status === "running" ? "text-violet-300" : status === "done" ? "text-green-300" : status === "error" ? "text-red-300" : "text-muted-foreground/60")}>
            {step.label}
          </span>
        </div>
        <p className="text-[11px] text-muted-foreground/50 mt-0.5 leading-relaxed">
          {message || step.description}
        </p>
      </div>
    </div>
  );
}

// ── AI Fill button ────────────────────────────────────────────────────────
function AIFillButton() {
  const { fields } = useSubmissionStore();
  const { syncDetected } = useSubmissionStore();
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${BASE}/api/apple/ai-fill`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          appName: fields.appName,
          appUrl: fields.supportUrl,
          category: fields.category,
          existingDescription: fields.description,
        }),
      });
      const data = await res.json() as { ok?: boolean; fields?: Record<string, string>; error?: string };
      if (!data.ok || !data.fields) throw new Error(data.error || "AI fill failed");
      syncDetected(data.fields as never);
      setDone(true);
      setTimeout(() => setDone(false), 3000);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-1">
      <button
        onClick={run}
        disabled={loading || !fields.appName}
        className={cn(
          "w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold font-mono uppercase tracking-wider border transition-all",
          done
            ? "bg-green-950/20 border-green-500/30 text-green-400"
            : "bg-violet-950/20 border-violet-500/20 text-violet-400 hover:bg-violet-950/40 disabled:opacity-40 disabled:cursor-not-allowed",
        )}
      >
        {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : done ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Sparkles className="h-3.5 w-3.5" />}
        {loading ? "Generating…" : done ? "Fields filled!" : "AI Auto-Fill Metadata"}
      </button>
      {error && <p className="text-[11px] text-red-400 px-1">{error}</p>}
      <p className="text-[10px] text-muted-foreground/40 text-center">
        Uses GPT-4o to write your description, subtitle, keywords & What's New
      </p>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────
export function AutoSubmitPanel() {
  const { selectedAppId, builds } = useAppleConnectStore();
  const { fields } = useSubmissionStore();
  const { checks, hardBlocked, warnings, allClear } = usePreflightChecks();

  const [stepStatuses, setStepStatuses] = useState<Record<string, StepStatus>>({});
  const [stepMessages, setStepMessages] = useState<Record<string, string>>({});
  const [running, setRunning] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [fatalError, setFatalError] = useState<string | null>(null);
  const esRef = useRef<EventSource | null>(null);

  const reset = useCallback(() => {
    esRef.current?.close();
    setStepStatuses({});
    setStepMessages({});
    setRunning(false);
    setCompleted(false);
    setFatalError(null);
  }, []);

  const launch = useCallback(() => {
    if (!selectedAppId) return;
    reset();
    setRunning(true);

    const latestBuildId = builds[0]?.id ?? "";

    const params = new URLSearchParams({
      version:     fields.version || "1.0.0",
      description: fields.description || "",
      keywords:    fields.keywords || "",
      supportUrl:  fields.supportUrl || "",
      whatsNew:    "",
      ...(latestBuildId ? { buildId: latestBuildId } : {}),
    });

    const url = `${BASE}/api/apple/pipeline/${selectedAppId}/run?${params.toString()}`;
    const es = new EventSource(url, { withCredentials: true });
    esRef.current = es;

    es.onmessage = (e) => {
      const event = JSON.parse(e.data as string) as StepEvent;

      if (event.step === "complete") {
        setCompleted(true);
        setRunning(false);
        es.close();
        return;
      }

      if (event.step === "error") {
        setFatalError(event.message);
        setRunning(false);
        es.close();
        return;
      }

      setStepStatuses(prev => ({ ...prev, [event.step]: event.status }));
      setStepMessages(prev => ({ ...prev, [event.step]: event.message }));
    };

    es.onerror = () => {
      setFatalError("Connection to pipeline lost. Check your network and try again.");
      setRunning(false);
      es.close();
    };
  }, [selectedAppId, builds, fields, reset]);

  const hasActivity = Object.keys(stepStatuses).length > 0;

  return (
    <div className="space-y-6 max-w-2xl">

      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Rocket className="h-4 w-4 text-violet-400" />
          <h2 className="text-sm font-bold font-mono uppercase tracking-widest text-foreground">One-Click Submit Pipeline</h2>
        </div>
        <p className="text-xs text-muted-foreground/60 leading-relaxed">
          PostApp handles everything — version slot, metadata push, build linking, and submission to Apple Review — automatically.
        </p>
      </div>

      {/* AI Fill */}
      <AIFillButton />

      {/* Pre-flight checklist */}
      <div className="rounded-xl border border-border/40 overflow-hidden">
        <div className="px-4 py-2.5 bg-muted/10 border-b border-border/40 flex items-center gap-2">
          <Shield className="h-3.5 w-3.5 text-muted-foreground/60" />
          <span className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground/60">Pre-flight Checks</span>
          {allClear
            ? <span className="ml-auto text-[10px] font-mono text-green-400 flex items-center gap-1"><CheckCircle2 className="h-3 w-3" />All clear</span>
            : <span className="ml-auto text-[10px] font-mono text-amber-400 flex items-center gap-1"><AlertTriangle className="h-3 w-3" />{hardBlocked.length} blocked</span>
          }
        </div>
        <div className="divide-y divide-border/20">
          {checks.map(c => (
            <div key={c.id} className="flex items-start gap-3 px-4 py-2.5">
              {c.pass
                ? <CheckCircle2 className="h-3.5 w-3.5 text-green-400 shrink-0 mt-0.5" />
                : c.warn
                  ? <AlertTriangle className="h-3.5 w-3.5 text-amber-400 shrink-0 mt-0.5" />
                  : <XCircle className="h-3.5 w-3.5 text-red-400 shrink-0 mt-0.5" />
              }
              <div className="flex-1 min-w-0">
                <p className={cn("text-xs", c.pass ? "text-foreground/80" : c.warn ? "text-amber-400/80" : "text-red-400/80")}>
                  {c.label}
                </p>
                {!c.pass && (
                  <p className="text-[10px] text-muted-foreground/50 mt-0.5">{c.fix}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Launch button */}
      {!hasActivity && !completed && (
        <div className="space-y-3">
          <button
            onClick={launch}
            disabled={!allClear || running}
            className={cn(
              "w-full py-4 rounded-2xl font-bold text-base tracking-wide transition-all duration-200 flex items-center justify-center gap-3",
              allClear
                ? "bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-500 hover:to-blue-500 text-white shadow-lg shadow-violet-900/30 hover:shadow-violet-900/50 hover:scale-[1.01] active:scale-[0.99]"
                : "bg-muted/20 border border-border/40 text-muted-foreground/40 cursor-not-allowed",
            )}
          >
            <Rocket className="h-5 w-5" />
            Launch Pipeline
          </button>
          {!allClear && hardBlocked.length > 0 && (
            <p className="text-[11px] text-center text-muted-foreground/50">
              Fix {hardBlocked.length} issue{hardBlocked.length > 1 ? "s" : ""} above to enable launch
            </p>
          )}
          {allClear && warnings.length > 0 && (
            <p className="text-[11px] text-center text-amber-400/60 flex items-center justify-center gap-1">
              <AlertTriangle className="h-3 w-3" />
              No build found — pipeline will attempt auto-link from TestFlight
            </p>
          )}
        </div>
      )}

      {/* Pipeline progress */}
      {hasActivity && !completed && !fatalError && (
        <div className="space-y-2">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-mono text-muted-foreground/60 uppercase tracking-wider flex items-center gap-2">
              <Zap className="h-3 w-3 text-violet-400 animate-pulse" />
              Pipeline Running
            </span>
          </div>
          {PIPELINE_STEPS.map(step => (
            <StepRow
              key={step.id}
              step={step}
              status={stepStatuses[step.id] ?? "idle"}
              message={stepMessages[step.id]}
            />
          ))}
        </div>
      )}

      {/* Fatal error */}
      {fatalError && (
        <div className="rounded-xl border border-red-500/30 bg-red-950/20 p-4 space-y-3">
          <div className="flex items-start gap-3">
            <WifiOff className="h-4 w-4 text-red-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-red-400">Pipeline stopped</p>
              <p className="text-xs text-red-400/70 mt-1 leading-relaxed">{fatalError}</p>
            </div>
          </div>
          <button
            onClick={reset}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-mono hover:bg-red-500/20 transition-colors"
          >
            <RotateCcw className="h-3 w-3" /> Try Again
          </button>
        </div>
      )}

      {/* Success state */}
      {completed && (
        <div className="rounded-2xl border border-green-500/30 bg-green-950/10 p-6 text-center space-y-4">
          <div className="flex justify-center">
            <div className="h-16 w-16 rounded-full bg-green-500/10 flex items-center justify-center">
              <Rocket className="h-8 w-8 text-green-400" />
            </div>
          </div>
          <div>
            <p className="text-lg font-bold text-green-400">App Submitted! 🚀</p>
            <p className="text-sm text-muted-foreground/70 mt-1 leading-relaxed">
              Your app is now in Apple's review queue. Reviews typically take 24–48 hours.
              You'll receive an email when the status changes.
            </p>
          </div>
          <div className="flex flex-col gap-2">
            {PIPELINE_STEPS.map(step => (
              <StepRow
                key={step.id}
                step={step}
                status={stepStatuses[step.id] ?? "skipped"}
                message={stepMessages[step.id]}
              />
            ))}
          </div>
          <button
            onClick={reset}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-muted/20 border border-border/40 text-muted-foreground text-xs font-mono hover:bg-muted/30 transition-colors"
          >
            <RotateCcw className="h-3 w-3" /> Submit Another Version
          </button>
        </div>
      )}
    </div>
  );
}
