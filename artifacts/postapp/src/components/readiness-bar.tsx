import { useSubmissionStore } from "@/state/submission-store";
import { useAppleConnectStore } from "@/state/apple-connect-store";
import { CheckCircle2, AlertTriangle, XCircle, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface ReadinessBarProps {
  missingFields: number;
  blockers: number;
  screenshotCount?: number;
  onNavigate: (tab: string) => void;
}

export function ReadinessBar({ missingFields, blockers, screenshotCount = 0, onNavigate }: ReadinessBarProps) {
  const { getCompletionStats } = useSubmissionStore();
  const { status: appleStatus } = useAppleConnectStore();
  const stats = getCompletionStats();

  const totalIssues = blockers + missingFields;
  const isReady = totalIssues === 0 && appleStatus === "connected";

  const color = isReady
    ? "text-green-400"
    : stats.percent >= 70
    ? "text-amber-400"
    : "text-red-400";

  const nextAction = (() => {
    if (appleStatus !== "connected") return { label: "Connect Apple credentials", tab: "settings" };
    if (missingFields > 0) return { label: `Fill ${missingFields} missing field${missingFields > 1 ? "s" : ""}`, tab: "metadata" };
    if (screenshotCount < 2) return { label: "Add screenshots", tab: "screenshots" };
    if (blockers > 0) return { label: `Fix ${blockers} blocker${blockers > 1 ? "s" : ""}`, tab: "overview" };
    return { label: "Ready to launch", tab: "launch" };
  })();

  return (
    <div className={cn(
      "flex items-center gap-3 px-4 py-2.5 rounded-xl border text-xs transition-all",
      isReady
        ? "bg-green-950/20 border-green-500/20"
        : "bg-muted/10 border-border/40"
    )}>
      {/* Score */}
      <div className="flex items-center gap-2 shrink-0">
        <div className="relative h-8 w-8">
          <svg className="h-8 w-8 -rotate-90" viewBox="0 0 32 32">
            <circle cx="16" cy="16" r="12" strokeWidth="3" fill="none" className="stroke-muted/30" />
            <circle
              cx="16" cy="16" r="12" strokeWidth="3" fill="none"
              stroke={isReady ? "#22c55e" : stats.percent >= 70 ? "#f59e0b" : "#ef4444"}
              strokeDasharray={`${2 * Math.PI * 12}`}
              strokeDashoffset={`${2 * Math.PI * 12 * (1 - stats.percent / 100)}`}
              strokeLinecap="round"
              style={{ transition: "stroke-dashoffset 0.6s ease" }}
            />
          </svg>
          <span className={cn("absolute inset-0 flex items-center justify-center text-[10px] font-bold font-mono", color)}>
            {stats.percent}
          </span>
        </div>
        <span className={cn("font-semibold font-mono hidden sm:block", color)}>
          {isReady ? "Launch Ready" : `${stats.percent}% ready`}
        </span>
      </div>

      <div className="h-4 w-px bg-border/40 shrink-0 hidden sm:block" />

      {/* Issues summary */}
      <div className="flex items-center gap-3 flex-1 min-w-0 flex-wrap">
        {blockers > 0 && (
          <span className="inline-flex items-center gap-1 text-red-400">
            <XCircle className="h-3 w-3" /> {blockers} blocker{blockers > 1 ? "s" : ""}
          </span>
        )}
        {missingFields > 0 && (
          <span className="inline-flex items-center gap-1 text-amber-400">
            <AlertTriangle className="h-3 w-3" /> {missingFields} missing
          </span>
        )}
        {isReady && (
          <span className="inline-flex items-center gap-1 text-green-400">
            <CheckCircle2 className="h-3 w-3" /> All checks passed
          </span>
        )}
      </div>

      {/* Next action CTA */}
      <button
        onClick={() => onNavigate(nextAction.tab)}
        className={cn(
          "inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold font-mono whitespace-nowrap border transition-all shrink-0",
          isReady
            ? "bg-green-600 hover:bg-green-500 text-white border-green-600"
            : "bg-violet-600/20 hover:bg-violet-600/30 text-violet-300 border-violet-500/30"
        )}
      >
        {nextAction.label}
        <ChevronRight className="h-3 w-3" />
      </button>
    </div>
  );
}
