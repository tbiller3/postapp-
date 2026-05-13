import { useAppleConnectStore } from "@/state/apple-connect-store";
import { AutoSubmitPanel } from "@/components/auto-submit-panel";
import { RejectionFixer } from "@/components/rejection-fixer";
import { CheckCircle2, Clock, Eye, Rocket, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

type ReviewState = "PREPARE_FOR_SUBMISSION" | "WAITING_FOR_REVIEW" | "IN_REVIEW" |
  "PENDING_DEVELOPER_RELEASE" | "READY_FOR_SALE" | "REJECTED" |
  "METADATA_REJECTED" | "DEVELOPER_REJECTED" | "UNKNOWN" | null;

interface LaunchTabProps {
  reviewState: ReviewState;
  versionString: string | null;
  rejectionReasons: string[];
  onResubmit?: () => void;
}

// ── State-specific panels ─────────────────────────────────────────────────

function WaitingPanel({ state, version }: { state: string; version: string | null }) {
  const isInReview = state === "IN_REVIEW";
  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-violet-500/20 bg-violet-950/10 p-8 flex flex-col items-center text-center gap-4">
        <div className={cn("h-16 w-16 rounded-full flex items-center justify-center", isInReview ? "bg-violet-500/10" : "bg-amber-500/10")}>
          {isInReview
            ? <Eye className="h-8 w-8 text-violet-400 animate-pulse" />
            : <Clock className="h-8 w-8 text-amber-400 animate-pulse" />
          }
        </div>
        <div>
          <p className={cn("text-lg font-bold", isInReview ? "text-violet-300" : "text-amber-300")}>
            {isInReview ? "Apple is reviewing your app" : "In the review queue"}
          </p>
          {version && <p className="text-sm text-muted-foreground/60 font-mono mt-1">Version {version}</p>}
          <p className="text-sm text-muted-foreground/60 mt-2 max-w-sm leading-relaxed">
            {isInReview
              ? "A reviewer at Apple is actively evaluating your app. This typically takes a few hours. You'll get an email when there's a decision."
              : "Your app is waiting for an available reviewer. Most apps are reviewed within 24 hours of entering the queue."
            }
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground/40 font-mono">
          <RefreshCw className="h-3 w-3 animate-spin" />
          Status updates every 90 seconds
        </div>
      </div>
    </div>
  );
}

function ApprovedPanel({ version }: { version: string | null }) {
  return (
    <div className="rounded-2xl border border-green-500/30 bg-green-950/10 p-8 flex flex-col items-center text-center gap-4">
      <div className="h-16 w-16 rounded-full bg-green-500/10 flex items-center justify-center">
        <CheckCircle2 className="h-8 w-8 text-green-400" />
      </div>
      <div>
        <p className="text-lg font-bold text-green-300">Approved by Apple 🎉</p>
        {version && <p className="text-sm text-muted-foreground/60 font-mono mt-1">Version {version}</p>}
        <p className="text-sm text-muted-foreground/60 mt-2 max-w-sm leading-relaxed">
          Your app is live on the App Store. Users can download it now.
          When you're ready to ship an update, come back here and run the pipeline again.
        </p>
      </div>
    </div>
  );
}

function PendingReleasePanel({ version }: { version: string | null }) {
  return (
    <div className="rounded-2xl border border-teal-500/20 bg-teal-950/10 p-8 flex flex-col items-center text-center gap-4">
      <div className="h-16 w-16 rounded-full bg-teal-500/10 flex items-center justify-center">
        <Rocket className="h-8 w-8 text-teal-400" />
      </div>
      <div>
        <p className="text-lg font-bold text-teal-300">Approved — Pending Your Release</p>
        {version && <p className="text-sm text-muted-foreground/60 font-mono mt-1">Version {version}</p>}
        <p className="text-sm text-muted-foreground/60 mt-2 max-w-sm leading-relaxed">
          Apple approved it. You chose manual release — go to App Store Connect and click
          "Release This Version" when you're ready to go live.
        </p>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────
export function LaunchTab({ reviewState, versionString, rejectionReasons, onResubmit }: LaunchTabProps) {
  const { selectedAppId } = useAppleConnectStore();

  // Show rejection fixer when rejected
  if (reviewState === "REJECTED" || reviewState === "METADATA_REJECTED") {
    return (
      <div className="space-y-6">
        <RejectionFixer
          appleAppId={selectedAppId ?? undefined}
          rejectionReasons={rejectionReasons}
          onResubmit={onResubmit}
        />
      </div>
    );
  }

  // Show waiting states
  if (reviewState === "WAITING_FOR_REVIEW" || reviewState === "IN_REVIEW") {
    return <WaitingPanel state={reviewState} version={versionString} />;
  }

  // Approved + pending release
  if (reviewState === "PENDING_DEVELOPER_RELEASE") {
    return <PendingReleasePanel version={versionString} />;
  }

  // Live on store
  if (reviewState === "READY_FOR_SALE") {
    return <ApprovedPanel version={versionString} />;
  }

  // Default: show the launch pipeline (PREPARE_FOR_SUBMISSION, null, UNKNOWN)
  return <AutoSubmitPanel />;
}
