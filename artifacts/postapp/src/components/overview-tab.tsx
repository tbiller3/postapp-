import { CheckCircle2, XCircle, AlertTriangle, Sparkles, ImageIcon, Rocket, ChevronRight, TrendingUp } from "lucide-react";
import { useSubmissionStore } from "@/state/submission-store";
import { useAppleConnectStore } from "@/state/apple-connect-store";
import { StatusMonitor } from "@/components/status-monitor";
import { cn } from "@/lib/utils";

interface OverviewTabProps {
  appId: number;
  appName: string;
  blockers: number;
  checklistComplete: number;
  checklistTotal: number;
  onNavigate: (tab: string) => void;
  onRejected?: (status: unknown) => void;
}

interface StepCardProps {
  step: number;
  title: string;
  description: string;
  done: boolean;
  partial?: boolean;
  cta: string;
  tab: string;
  icon: React.ElementType;
  onNavigate: (tab: string) => void;
}

function StepCard({ step, title, description, done, partial, cta, tab, icon: Icon, onNavigate }: StepCardProps) {
  return (
    <div
      className={cn(
        "rounded-xl border p-4 flex items-start gap-4 transition-all cursor-pointer group",
        done
          ? "border-green-500/20 bg-green-950/10"
          : partial
          ? "border-amber-500/20 bg-amber-950/10 hover:border-amber-500/40"
          : "border-border/40 bg-card hover:border-violet-500/30 hover:bg-violet-950/10"
      )}
      onClick={() => !done && onNavigate(tab)}
    >
      {/* Step number / check */}
      <div className={cn(
        "h-9 w-9 rounded-full flex items-center justify-center shrink-0 font-bold text-sm font-mono border-2",
        done
          ? "border-green-500/40 bg-green-500/10 text-green-400"
          : partial
          ? "border-amber-500/40 bg-amber-500/10 text-amber-400"
          : "border-border/50 bg-muted/10 text-muted-foreground/50 group-hover:border-violet-500/40 group-hover:text-violet-400"
      )}>
        {done ? <CheckCircle2 className="h-5 w-5" /> : step}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <Icon className={cn("h-3.5 w-3.5 shrink-0", done ? "text-green-400" : partial ? "text-amber-400" : "text-muted-foreground/50")} />
          <p className={cn("text-sm font-semibold", done ? "text-green-300" : "text-foreground/80")}>{title}</p>
          {done && <span className="text-[10px] font-mono text-green-400/70 px-1.5 py-0.5 rounded bg-green-500/10 border border-green-500/20">Done</span>}
          {partial && !done && <span className="text-[10px] font-mono text-amber-400/70 px-1.5 py-0.5 rounded bg-amber-500/10 border border-amber-500/20">In progress</span>}
        </div>
        <p className="text-xs text-muted-foreground/60 mt-1 leading-relaxed">{description}</p>
      </div>

      {!done && (
        <div className={cn(
          "inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold font-mono border shrink-0 transition-all",
          partial
            ? "bg-amber-500/10 border-amber-500/20 text-amber-400 group-hover:bg-amber-500/20"
            : "bg-muted/20 border-border/40 text-muted-foreground/60 group-hover:bg-violet-600/20 group-hover:border-violet-500/30 group-hover:text-violet-300"
        )}>
          {cta} <ChevronRight className="h-3 w-3" />
        </div>
      )}
    </div>
  );
}

export function OverviewTab({ appId, appName, blockers, checklistComplete, checklistTotal, onNavigate, onRejected }: OverviewTabProps) {
  const { getCompletionStats, fields } = useSubmissionStore();
  const { status: appleStatus, builds } = useAppleConnectStore();
  const stats = getCompletionStats();

  const metaDone = stats.percent >= 90;
  const metaPartial = !metaDone && stats.percent > 20;
  const appleDone = appleStatus === "connected";
  const buildDone = builds.length > 0;
  const isFirstTime = stats.percent < 10 && !appleDone;

  return (
    <div className="space-y-6">

      {/* First-time onboarding hero — shown when app is brand new */}
      {isFirstTime && (
        <div className="rounded-2xl border border-violet-500/20 bg-gradient-to-br from-violet-950/30 to-blue-950/20 p-6 space-y-4">
          <div className="space-y-1">
            <p className="text-lg font-bold text-foreground">Welcome to {appName || "your app"} 👋</p>
            <p className="text-sm text-muted-foreground/70 leading-relaxed max-w-lg">
              PostApp handles everything between you and the App Store.
              Three steps and your app is live — we've automated as much as possible.
            </p>
          </div>
          <button
            onClick={() => onNavigate("metadata")}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-semibold transition-all"
          >
            <Sparkles className="h-4 w-4" /> Start with AI Auto-Fill
          </button>
        </div>
      )}

      {/* Three-step guided flow */}
      <div className="space-y-3">
        {!isFirstTime && (
          <p className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground/40">Your Progress</p>
        )}

        <StepCard
          step={1}
          icon={Sparkles}
          title="Fill your metadata"
          description="App name, description, keywords, screenshots — everything Apple needs to review your app."
          done={metaDone}
          partial={metaPartial}
          cta="Open Metadata"
          tab="metadata"
          onNavigate={onNavigate}
        />
        <StepCard
          step={2}
          icon={ImageIcon}
          title="Upload screenshots"
          description="Drop your screenshots and PostApp resizes and uploads them to all required device sizes automatically."
          done={false}
          partial={false}
          cta="Add Screenshots"
          tab="screenshots"
          onNavigate={onNavigate}
        />
        <StepCard
          step={3}
          icon={Rocket}
          title="Launch"
          description="One button. PostApp verifies everything, pushes your metadata, links your build, and submits to Apple Review."
          done={false}
          partial={appleDone && metaDone}
          cta="Go to Launch"
          tab="launch"
          onNavigate={onNavigate}
        />
      </div>

      {/* Checklist summary — only show if there's meaningful data */}
      {checklistTotal > 0 && (
        <div className="rounded-xl border border-border/40 overflow-hidden">
          <div
            className="flex items-center gap-3 px-4 py-3 hover:bg-muted/10 cursor-pointer transition-colors"
            onClick={() => onNavigate("settings")}
          >
            <TrendingUp className="h-4 w-4 text-muted-foreground/50 shrink-0" />
            <div className="flex-1">
              <p className="text-xs font-semibold text-foreground/70">Operations Checklist</p>
              <div className="flex items-center gap-2 mt-1">
                <div className="flex-1 h-1.5 bg-muted/30 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-primary to-blue-400 rounded-full transition-all duration-500"
                    style={{ width: `${checklistTotal > 0 ? (checklistComplete / checklistTotal) * 100 : 0}%` }}
                  />
                </div>
                <span className="text-[10px] font-mono text-muted-foreground/50 shrink-0">
                  {checklistComplete}/{checklistTotal}
                </span>
              </div>
            </div>
            {blockers > 0 && (
              <span className="inline-flex items-center gap-1 text-[10px] font-mono text-red-400 bg-red-950/20 border border-red-500/20 px-2 py-0.5 rounded-full">
                <AlertTriangle className="h-3 w-3" /> {blockers} blocking
              </span>
            )}
            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/30 shrink-0" />
          </div>
        </div>
      )}

      {/* Live status monitor */}
      <div className="space-y-2">
        <p className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground/40">Apple Review Status</p>
        <StatusMonitor onRejected={onRejected} />
      </div>
    </div>
  );
}
