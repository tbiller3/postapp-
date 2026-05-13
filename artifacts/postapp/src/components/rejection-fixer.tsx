import { useState } from "react";
import { useAppleConnectStore } from "@/state/apple-connect-store";
import { useSubmissionStore } from "@/state/submission-store";
import {
  ShieldAlert, Sparkles, Loader2, CheckCircle2, XCircle,
  ChevronDown, ChevronRight, Clock, AlertTriangle, RotateCcw,
} from "lucide-react";
import { cn } from "@/lib/utils";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

// ── Types ─────────────────────────────────────────────────────────────────
interface FixItem {
  title: string;
  guideline: string;
  description: string;
  howTo: string;
  canResubmitImmediately: boolean;
}

interface RejectionAnalysis {
  summary: string;
  severity: "minor" | "moderate" | "critical";
  fixes: FixItem[];
  resubmitChecklist: string[];
  estimatedTimeToFix: string;
}

// ── Single fix card ────────────────────────────────────────────────────────
function FixCard({ fix, checked, onToggle }: { fix: FixItem; checked: boolean; onToggle: () => void }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className={cn(
      "rounded-xl border transition-all",
      checked ? "border-green-500/20 bg-green-950/10" : "border-border/40 bg-card",
    )}>
      <div className="flex items-start gap-3 px-4 py-3">
        {/* Checkbox */}
        <button
          onClick={onToggle}
          className={cn(
            "h-5 w-5 rounded border-2 flex items-center justify-center shrink-0 mt-0.5 transition-all",
            checked ? "border-green-500 bg-green-500/20" : "border-border/60 hover:border-violet-500/60",
          )}
        >
          {checked && <CheckCircle2 className="h-3.5 w-3.5 text-green-400" />}
        </button>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className={cn("text-sm font-semibold", checked && "line-through text-muted-foreground/40")}>
              {fix.title}
            </p>
            {fix.guideline && (
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-muted/20 border border-border/40 text-muted-foreground/60">
                §{fix.guideline}
              </span>
            )}
            {fix.canResubmitImmediately && (
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-teal-500/10 border border-teal-500/20 text-teal-400">
                Quick fix
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground/60 mt-1 leading-relaxed">{fix.description}</p>
        </div>

        <button
          onClick={() => setExpanded(o => !o)}
          className="text-muted-foreground/40 hover:text-muted-foreground transition-colors shrink-0 mt-1"
        >
          {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </button>
      </div>

      {/* How-to steps */}
      {expanded && (
        <div className="px-4 pb-3 pt-0 border-t border-border/30 space-y-2">
          <p className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground/40 pt-2">How to fix</p>
          <p className="text-xs text-muted-foreground/70 leading-relaxed whitespace-pre-line">{fix.howTo}</p>
        </div>
      )}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────
interface RejectionFixerProps {
  appleAppId?: string;
  versionId?: string;
  rejectionReasons?: string[];
  onResubmit?: () => void;
}

export function RejectionFixer({ appleAppId, versionId, rejectionReasons = [], onResubmit }: RejectionFixerProps) {
  const { selectedAppId } = useAppleConnectStore();
  const { fields } = useSubmissionStore();

  const [analysis, setAnalysis] = useState<RejectionAnalysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checkedFixes, setCheckedFixes] = useState<Set<number>>(new Set());
  const [manualReasons, setManualReasons] = useState("");
  const [showManual, setShowManual] = useState(rejectionReasons.length === 0);

  const effectiveAppId = appleAppId ?? selectedAppId ?? "";

  const analyze = async () => {
    setLoading(true);
    setError(null);
    setAnalysis(null);
    setCheckedFixes(new Set());
    try {
      const reasons = rejectionReasons.length > 0
        ? rejectionReasons
        : manualReasons.split("\n").map(l => l.trim()).filter(Boolean);

      const res = await fetch(`${BASE}/api/apple/apps/${effectiveAppId}/rejection-fix`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          versionId,
          rejectionReasons: reasons,
          appName: fields.appName || "this app",
        }),
      });
      const data = await res.json() as { ok?: boolean; analysis?: RejectionAnalysis; error?: string };
      if (!data.ok || !data.analysis) throw new Error(data.error ?? "Analysis failed");
      setAnalysis(data.analysis);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Analysis failed");
    } finally {
      setLoading(false);
    }
  };

  const toggleFix = (i: number) => {
    setCheckedFixes(prev => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i); else next.add(i);
      return next;
    });
  };

  const allFixed = analysis ? checkedFixes.size === analysis.fixes.length : false;

  const severityConfig = {
    minor:    { color: "text-green-400",  bg: "bg-green-950/10",  border: "border-green-500/20",  label: "Minor" },
    moderate: { color: "text-amber-400",  bg: "bg-amber-950/10",  border: "border-amber-500/20",  label: "Moderate" },
    critical: { color: "text-red-400",    bg: "bg-red-950/20",    border: "border-red-500/30",    label: "Critical" },
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-2">
        <ShieldAlert className="h-4 w-4 text-red-400" />
        <h2 className="text-sm font-bold font-mono uppercase tracking-widest">Smart Rejection Fixer</h2>
      </div>

      {/* Manual reason entry (if no auto-detected reasons) */}
      {showManual && rejectionReasons.length === 0 && (
        <div className="space-y-2">
          <label className="text-xs font-mono uppercase tracking-wider text-muted-foreground/60">
            Paste rejection reason from Apple's email
          </label>
          <textarea
            value={manualReasons}
            onChange={e => setManualReasons(e.target.value)}
            placeholder="Paste the rejection reason text here, one reason per line..."
            rows={5}
            className="w-full rounded-xl border border-border/40 bg-card px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/30 focus:outline-none focus:ring-1 focus:ring-violet-500/50 resize-none font-mono text-xs"
          />
        </div>
      )}

      {/* Detected reasons display */}
      {rejectionReasons.length > 0 && (
        <div className="rounded-xl border border-red-500/20 bg-red-950/10 p-4 space-y-2">
          <p className="text-[11px] font-mono uppercase tracking-wider text-red-400/70">Apple's Rejection Reason{rejectionReasons.length > 1 ? "s" : ""}</p>
          {rejectionReasons.map((r, i) => (
            <p key={i} className="text-xs text-red-300/70 leading-relaxed flex gap-2">
              <span className="text-red-400/40 font-mono shrink-0">{i + 1}.</span>
              {r}
            </p>
          ))}
          <button
            onClick={() => setShowManual(o => !o)}
            className="text-[10px] text-muted-foreground/40 hover:text-muted-foreground/70 font-mono underline"
          >
            + Add additional context
          </button>
          {showManual && (
            <textarea
              value={manualReasons}
              onChange={e => setManualReasons(e.target.value)}
              placeholder="Add more context for the AI..."
              rows={3}
              className="w-full rounded-lg border border-border/40 bg-background/50 px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground/30 focus:outline-none resize-none font-mono mt-1"
            />
          )}
        </div>
      )}

      {/* Analyze button */}
      {!analysis && (
        <button
          onClick={analyze}
          disabled={loading || (!effectiveAppId && rejectionReasons.length === 0 && !manualReasons.trim())}
          className={cn(
            "w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold transition-all",
            loading
              ? "bg-violet-950/30 border border-violet-500/20 text-violet-400/60 cursor-not-allowed"
              : "bg-gradient-to-r from-violet-600 to-red-600 hover:from-violet-500 hover:to-red-500 text-white shadow-md disabled:opacity-40 disabled:cursor-not-allowed",
          )}
        >
          {loading
            ? <><Loader2 className="h-4 w-4 animate-spin" /> Analyzing with GPT-4o…</>
            : <><Sparkles className="h-4 w-4" /> Analyze & Generate Fix Plan</>
          }
        </button>
      )}

      {/* Error */}
      {error && (
        <div className="rounded-xl border border-red-500/20 bg-red-950/10 p-3 flex items-center gap-2">
          <XCircle className="h-4 w-4 text-red-400 shrink-0" />
          <p className="text-xs text-red-400">{error}</p>
        </div>
      )}

      {/* Analysis results */}
      {analysis && (
        <div className="space-y-5">
          {/* Summary bar */}
          <div className={cn(
            "rounded-xl border p-4 space-y-2",
            severityConfig[analysis.severity].bg,
            severityConfig[analysis.severity].border,
          )}>
            <div className="flex items-center gap-2">
              <AlertTriangle className={cn("h-4 w-4 shrink-0", severityConfig[analysis.severity].color)} />
              <span className={cn("text-xs font-mono font-bold uppercase tracking-wider", severityConfig[analysis.severity].color)}>
                {severityConfig[analysis.severity].label} Rejection
              </span>
              <div className="ml-auto flex items-center gap-1 text-[10px] font-mono text-muted-foreground/50">
                <Clock className="h-3 w-3" />
                Est. fix time: {analysis.estimatedTimeToFix}
              </div>
            </div>
            <p className="text-sm text-foreground/80 leading-relaxed">{analysis.summary}</p>
          </div>

          {/* Progress */}
          <div className="flex items-center gap-3">
            <div className="flex-1 h-1.5 bg-muted/30 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-violet-500 to-green-500 transition-all duration-500 rounded-full"
                style={{ width: `${analysis.fixes.length > 0 ? (checkedFixes.size / analysis.fixes.length) * 100 : 0}%` }}
              />
            </div>
            <span className="text-[11px] font-mono text-muted-foreground/60 shrink-0">
              {checkedFixes.size}/{analysis.fixes.length} fixed
            </span>
          </div>

          {/* Fix items */}
          <div className="space-y-3">
            <p className="text-xs font-mono uppercase tracking-wider text-muted-foreground/50">Required Fixes</p>
            {analysis.fixes.map((fix, i) => (
              <FixCard
                key={i}
                fix={fix}
                checked={checkedFixes.has(i)}
                onToggle={() => toggleFix(i)}
              />
            ))}
          </div>

          {/* Resubmit checklist */}
          {analysis.resubmitChecklist.length > 0 && (
            <div className="rounded-xl border border-border/40 bg-muted/5 p-4 space-y-2">
              <p className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground/50">Before Re-submitting, Verify</p>
              {analysis.resubmitChecklist.map((item, i) => (
                <div key={i} className="flex items-start gap-2 text-xs text-muted-foreground/60">
                  <ChevronRight className="h-3.5 w-3.5 shrink-0 mt-0.5 text-muted-foreground/30" />
                  {item}
                </div>
              ))}
            </div>
          )}

          {/* Re-analyze / Re-submit buttons */}
          <div className="flex gap-3 pt-1">
            <button
              onClick={() => { setAnalysis(null); setCheckedFixes(new Set()); }}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-muted/20 border border-border/40 text-muted-foreground text-xs font-mono hover:bg-muted/30 transition-colors"
            >
              <RotateCcw className="h-3.5 w-3.5" /> Re-analyze
            </button>
            {allFixed && onResubmit && (
              <button
                onClick={onResubmit}
                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-500 hover:to-blue-500 text-white text-xs font-semibold transition-all"
              >
                <CheckCircle2 className="h-3.5 w-3.5" /> All Fixed — Re-submit to Apple
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
