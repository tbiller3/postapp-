import { useState, useEffect, useCallback } from "react";
import { useAppleConnectStore } from "@/state/apple-connect-store";
import {
  Activity, CheckCircle2, Clock, XCircle, AlertTriangle,
  RefreshCw, Loader2, Eye, TrendingUp,
} from "lucide-react";
import { cn } from "@/lib/utils";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
const POLL_INTERVAL_MS = 90_000; // 90 seconds

// ── Types ─────────────────────────────────────────────────────────────────
type ReviewState =
  | "READY_FOR_SALE"
  | "DEVELOPER_REMOVED_FROM_SALE"
  | "PREPARE_FOR_SUBMISSION"
  | "WAITING_FOR_REVIEW"
  | "IN_REVIEW"
  | "PENDING_DEVELOPER_RELEASE"
  | "REJECTED"
  | "METADATA_REJECTED"
  | "DEVELOPER_REJECTED"
  | "UNKNOWN";

interface ReviewStatus {
  state: ReviewState;
  versionString: string | null;
  versionId: string | null;
  rejectionReasons: string[];
}

// ── State config ───────────────────────────────────────────────────────────
const STATE_CONFIG: Record<ReviewState, { label: string; color: string; bg: string; border: string; icon: React.ElementType; pulse?: boolean }> = {
  READY_FOR_SALE:              { label: "Live on App Store",      color: "text-green-400",  bg: "bg-green-950/20",   border: "border-green-500/30",  icon: CheckCircle2 },
  DEVELOPER_REMOVED_FROM_SALE: { label: "Removed from Sale",      color: "text-slate-400",  bg: "bg-muted/10",       border: "border-border/30",     icon: XCircle },
  PREPARE_FOR_SUBMISSION:      { label: "Ready to Submit",        color: "text-blue-400",   bg: "bg-blue-950/10",    border: "border-blue-500/20",   icon: Clock },
  WAITING_FOR_REVIEW:          { label: "Waiting for Review",     color: "text-amber-400",  bg: "bg-amber-950/20",   border: "border-amber-500/30",  icon: Clock, pulse: true },
  IN_REVIEW:                   { label: "In Review",              color: "text-violet-400", bg: "bg-violet-950/20",  border: "border-violet-500/30", icon: Eye,   pulse: true },
  PENDING_DEVELOPER_RELEASE:   { label: "Approved — Pending Release", color: "text-teal-400",  bg: "bg-teal-950/20",    border: "border-teal-500/30",  icon: CheckCircle2, pulse: true },
  REJECTED:                    { label: "Rejected",               color: "text-red-400",    bg: "bg-red-950/20",     border: "border-red-500/30",    icon: XCircle },
  METADATA_REJECTED:           { label: "Metadata Rejected",      color: "text-red-400",    bg: "bg-red-950/20",     border: "border-red-500/30",    icon: AlertTriangle },
  DEVELOPER_REJECTED:          { label: "Developer Pulled",       color: "text-slate-400",  bg: "bg-muted/10",       border: "border-border/30",     icon: XCircle },
  UNKNOWN:                     { label: "Unknown",                color: "text-muted-foreground", bg: "bg-muted/10", border: "border-border/30",     icon: Activity },
};

// ── Timeline entry ─────────────────────────────────────────────────────────
interface TimelineEntry {
  state: ReviewState;
  version: string;
  ts: number;
}

// ── Main component ────────────────────────────────────────────────────────
export function StatusMonitor({ onRejected }: { onRejected?: (status: ReviewStatus) => void }) {
  const { selectedAppId, status: appleStatus } = useAppleConnectStore();

  const [reviewStatus, setReviewStatus] = useState<ReviewStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);
  const [timeline, setTimeline] = useState<TimelineEntry[]>([]);

  const fetch_ = useCallback(async (appId: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${BASE}/api/apple/apps/${appId}/review-status`, { credentials: "include" });
      const data = await res.json() as ReviewStatus & { error?: string };
      if (data.error) throw new Error(data.error);

      setReviewStatus(data);
      setLastChecked(new Date());

      // Update timeline if state changed
      setTimeline(prev => {
        const last = prev[prev.length - 1];
        if (!last || last.state !== data.state || last.version !== data.versionString) {
          return [...prev.slice(-9), { state: data.state, version: data.versionString ?? "—", ts: Date.now() }];
        }
        return prev;
      });

      // Notify parent if rejected
      if ((data.state === "REJECTED" || data.state === "METADATA_REJECTED") && onRejected) {
        onRejected(data);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to fetch status");
    } finally {
      setLoading(false);
    }
  }, [onRejected]);

  // Initial load + auto-poll
  useEffect(() => {
    if (appleStatus !== "connected" || !selectedAppId) return;
    fetch_(selectedAppId);
    const timer = setInterval(() => fetch_(selectedAppId), POLL_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [selectedAppId, appleStatus, fetch_]);

  if (appleStatus !== "connected") {
    return (
      <div className="rounded-xl border border-border/40 bg-muted/5 p-6 flex items-center gap-3 text-muted-foreground/50">
        <Activity className="h-5 w-5" />
        <p className="text-sm">Connect Apple credentials to monitor review status</p>
      </div>
    );
  }

  if (!selectedAppId) {
    return (
      <div className="rounded-xl border border-border/40 bg-muted/5 p-6 flex items-center gap-3 text-muted-foreground/50">
        <Activity className="h-5 w-5" />
        <p className="text-sm">Select an app in the Apple Connect tab</p>
      </div>
    );
  }

  const cfg = reviewStatus ? (STATE_CONFIG[reviewStatus.state] ?? STATE_CONFIG.UNKNOWN) : null;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity className={cn("h-4 w-4", loading ? "animate-pulse text-violet-400" : "text-muted-foreground/60")} />
          <span className="text-xs font-mono uppercase tracking-wider text-muted-foreground/60">Live Review Status</span>
          {cfg?.pulse && <span className="h-2 w-2 rounded-full bg-violet-400 animate-pulse" />}
        </div>
        <div className="flex items-center gap-2">
          {lastChecked && (
            <span className="text-[10px] text-muted-foreground/40 font-mono">
              updated {lastChecked.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </span>
          )}
          <button
            onClick={() => selectedAppId && fetch_(selectedAppId)}
            disabled={loading}
            className="p-1.5 rounded-md hover:bg-muted/20 text-muted-foreground/40 hover:text-muted-foreground transition-colors disabled:opacity-40"
          >
            <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
          </button>
        </div>
      </div>

      {/* Loading skeleton */}
      {loading && !reviewStatus && (
        <div className="rounded-xl border border-border/40 bg-muted/10 p-5 flex items-center gap-3">
          <Loader2 className="h-5 w-5 animate-spin text-violet-400" />
          <p className="text-sm text-muted-foreground/60">Checking Apple review status…</p>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="rounded-xl border border-red-500/20 bg-red-950/10 p-4 flex items-center gap-3">
          <XCircle className="h-4 w-4 text-red-400 shrink-0" />
          <p className="text-xs text-red-400">{error}</p>
        </div>
      )}

      {/* Status card */}
      {reviewStatus && cfg && (
        <div className={cn("rounded-xl border p-5 space-y-3", cfg.bg, cfg.border)}>
          <div className="flex items-center gap-3">
            <cfg.icon className={cn("h-6 w-6 shrink-0", cfg.color)} />
            <div className="flex-1">
              <p className={cn("text-sm font-bold", cfg.color)}>{cfg.label}</p>
              {reviewStatus.versionString && (
                <p className="text-xs text-muted-foreground/60 mt-0.5 font-mono">Version {reviewStatus.versionString}</p>
              )}
            </div>
          </div>

          {/* Rejection reasons */}
          {reviewStatus.rejectionReasons.length > 0 && (
            <div className="space-y-2 pt-1 border-t border-red-500/20">
              <p className="text-[11px] font-mono uppercase text-red-400/70 tracking-wider">Apple's Rejection Reason{reviewStatus.rejectionReasons.length > 1 ? "s" : ""}</p>
              {reviewStatus.rejectionReasons.map((r, i) => (
                <div key={i} className="flex gap-2 text-xs text-red-300/80 leading-relaxed">
                  <span className="shrink-0 font-mono text-red-400/50">{i + 1}.</span>
                  <span>{r}</span>
                </div>
              ))}
            </div>
          )}

          {/* Auto-poll notice */}
          <p className="text-[10px] text-muted-foreground/30 font-mono">
            Auto-refreshes every 90 seconds · Last: {lastChecked?.toLocaleTimeString() ?? "—"}
          </p>
        </div>
      )}

      {/* Timeline */}
      {timeline.length > 1 && (
        <div className="rounded-xl border border-border/30 overflow-hidden">
          <div className="px-4 py-2 border-b border-border/30 bg-muted/5 flex items-center gap-2">
            <TrendingUp className="h-3.5 w-3.5 text-muted-foreground/40" />
            <span className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground/40">Status History</span>
          </div>
          <div className="divide-y divide-border/20">
            {[...timeline].reverse().map((entry, i) => {
              const ec = STATE_CONFIG[entry.state] ?? STATE_CONFIG.UNKNOWN;
              const EntryIcon = ec.icon;
              return (
                <div key={i} className="flex items-center gap-3 px-4 py-2.5">
                  <EntryIcon className={cn("h-3.5 w-3.5 shrink-0", ec.color)} />
                  <span className={cn("text-xs font-mono", ec.color)}>{ec.label}</span>
                  <span className="text-[10px] text-muted-foreground/40 font-mono ml-1">v{entry.version}</span>
                  <span className="text-[10px] text-muted-foreground/30 font-mono ml-auto">
                    {new Date(entry.ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
