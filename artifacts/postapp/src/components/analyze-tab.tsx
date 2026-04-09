import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AlertCircle, AlertTriangle, Info, CheckCircle2,
  Loader2, Zap, ChevronRight, RefreshCw, TrendingUp,
} from "lucide-react";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

interface Finding {
  severity: "blocker" | "high" | "medium" | "info";
  category: string;
  message: string;
  fix?: string;
}

interface AnalysisReport {
  score: number;
  label: string;
  blockers: Finding[];
  highRisk: Finding[];
  medium: Finding[];
  nextActions: string[];
  meta: {
    urlReachable: boolean | null;
    hasViewport: boolean | null;
    hasPrivacyLink: boolean | null;
    hasLoginForm: boolean | null;
    checklistTotal: number;
    checklistComplete: number;
    screenshotCount: number;
  };
}

const SEVERITY_CONFIG = {
  blocker: {
    label: "Blocker",
    icon: AlertCircle,
    bg: "bg-red-950/30",
    border: "border-red-500/30",
    text: "text-red-400",
    badge: "bg-red-500/20 text-red-400",
  },
  high: {
    label: "High Risk",
    icon: AlertTriangle,
    bg: "bg-amber-950/20",
    border: "border-amber-500/30",
    text: "text-amber-400",
    badge: "bg-amber-500/20 text-amber-400",
  },
  medium: {
    label: "Medium",
    icon: Info,
    bg: "bg-yellow-950/10",
    border: "border-yellow-500/20",
    text: "text-yellow-400",
    badge: "bg-yellow-500/10 text-yellow-500",
  },
  info: {
    label: "Info",
    icon: Info,
    bg: "bg-blue-950/10",
    border: "border-blue-500/20",
    text: "text-blue-400",
    badge: "bg-blue-500/10 text-blue-400",
  },
};

function ScoreRing({ score, label }: { score: number; label: string }) {
  const r = 42;
  const circ = 2 * Math.PI * r;
  const offset = circ - (score / 100) * circ;
  const color = score >= 90 ? "#22c55e" : score >= 70 ? "#a78bfa" : score >= 50 ? "#f59e0b" : "#ef4444";

  return (
    <div className="flex flex-col items-center">
      <div className="relative w-28 h-28">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r={r} stroke="#27272a" strokeWidth="10" fill="none" />
          <circle
            cx="50" cy="50" r={r}
            stroke={color}
            strokeWidth="10"
            fill="none"
            strokeDasharray={circ}
            strokeDashoffset={offset}
            strokeLinecap="round"
            style={{ transition: "stroke-dashoffset 0.8s ease" }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-bold font-mono" style={{ color }}>{score}</span>
          <span className="text-[10px] text-muted-foreground">/ 100</span>
        </div>
      </div>
      <p className="text-sm font-semibold mt-2" style={{ color }}>{label}</p>
    </div>
  );
}

function FindingRow({ finding }: { finding: Finding }) {
  const [open, setOpen] = useState(false);
  const cfg = SEVERITY_CONFIG[finding.severity];
  const Icon = cfg.icon;

  return (
    <div className={`rounded-lg border ${cfg.border} ${cfg.bg} overflow-hidden`}>
      <button
        className="w-full flex items-start gap-3 px-4 py-3 text-left"
        onClick={() => finding.fix && setOpen(o => !o)}
      >
        <Icon className={`h-4 w-4 mt-0.5 shrink-0 ${cfg.text}`} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${cfg.badge}`}>
              {finding.category}
            </span>
            <span className="text-sm text-foreground/90">{finding.message}</span>
          </div>
        </div>
        {finding.fix && (
          <ChevronRight className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${open ? "rotate-90" : ""}`} />
        )}
      </button>
      {open && finding.fix && (
        <div className="px-4 pb-3 pt-0 border-t border-border/30">
          <p className="text-xs text-muted-foreground leading-relaxed">{finding.fix}</p>
        </div>
      )}
    </div>
  );
}

function SectionGroup({ title, findings, defaultOpen = true }: { title: string; findings: Finding[]; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  if (!findings.length) return null;
  const cfg = SEVERITY_CONFIG[findings[0].severity];

  return (
    <div>
      <button
        className="flex items-center gap-2 mb-2 w-full"
        onClick={() => setOpen(o => !o)}
      >
        <span className={`text-xs font-mono font-semibold uppercase ${cfg.text}`}>{title}</span>
        <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${cfg.badge}`}>{findings.length}</span>
        <ChevronRight className={`h-3.5 w-3.5 ml-auto text-muted-foreground transition-transform ${open ? "rotate-90" : ""}`} />
      </button>
      {open && (
        <div className="space-y-2">
          {findings.map((f, i) => <FindingRow key={i} finding={f} />)}
        </div>
      )}
    </div>
  );
}

export function AnalyzeTab({ appId }: { appId: number }) {
  const [report, setReport] = useState<AnalysisReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const runAnalysis = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${BASE}/api/apps/${appId}/analyze`, { credentials: "include" });
      if (!res.ok) throw new Error("Analysis failed");
      const data = await res.json() as AnalysisReport;
      setReport(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Analysis failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold font-mono uppercase tracking-widest text-muted-foreground">V25 Analyzer</h2>
          <p className="text-xs text-muted-foreground/60 mt-0.5">
            Scans your app URL, metadata, assets, and build pipeline for rejection risks.
          </p>
        </div>
        <Button
          onClick={runAnalysis}
          disabled={loading}
          size="sm"
          className="gap-2 bg-violet-600 hover:bg-violet-700"
        >
          {loading
            ? <><Loader2 className="h-4 w-4 animate-spin" />Scanning…</>
            : report
              ? <><RefreshCw className="h-4 w-4" />Re-scan</>
              : <><Zap className="h-4 w-4" />Run Analysis</>
          }
        </Button>
      </div>

      {/* Empty state */}
      {!report && !loading && !error && (
        <Card className="bg-card border-border">
          <CardContent className="py-12 flex flex-col items-center text-center gap-4">
            <div className="h-14 w-14 rounded-full bg-violet-500/10 flex items-center justify-center">
              <TrendingUp className="h-6 w-6 text-violet-400" />
            </div>
            <div>
              <p className="text-sm font-semibold">No analysis yet</p>
              <p className="text-xs text-muted-foreground mt-1 max-w-xs">
                Tap Run Analysis to scan your app for App Store rejection risks, metadata gaps, missing assets, and build readiness.
              </p>
            </div>
            <Button onClick={runAnalysis} className="bg-violet-600 hover:bg-violet-700 gap-2">
              <Zap className="h-4 w-4" /> Run Analysis
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Loading */}
      {loading && (
        <Card className="bg-card border-border">
          <CardContent className="py-12 flex flex-col items-center gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-violet-400" />
            <div className="text-center">
              <p className="text-sm font-semibold">Analyzing your app…</p>
              <p className="text-xs text-muted-foreground mt-1">Checking URL, metadata, assets, and build pipeline</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Error */}
      {error && (
        <Card className="bg-red-950/20 border-red-500/30">
          <CardContent className="py-4 flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-red-400 shrink-0" />
            <p className="text-sm text-red-400">{error}</p>
          </CardContent>
        </Card>
      )}

      {/* Results */}
      {report && !loading && (
        <>
          {/* Score + meta */}
          <Card className="bg-card border-border">
            <CardContent className="pt-5 pb-5">
              <div className="flex items-center gap-6">
                <ScoreRing score={report.score} label={report.label} />
                <div className="flex-1 grid grid-cols-2 gap-3">
                  {[
                    { label: "Blockers", value: report.blockers.length, color: report.blockers.length > 0 ? "text-red-400" : "text-green-400" },
                    { label: "High Risk", value: report.highRisk.length, color: report.highRisk.length > 0 ? "text-amber-400" : "text-green-400" },
                    { label: "Checklist", value: `${report.meta.checklistComplete}/${report.meta.checklistTotal}`, color: report.meta.checklistComplete === report.meta.checklistTotal ? "text-green-400" : "text-muted-foreground" },
                    { label: "Screenshots", value: report.meta.screenshotCount, color: report.meta.screenshotCount >= 3 ? "text-green-400" : "text-amber-400" },
                  ].map(({ label, value, color }) => (
                    <div key={label} className="bg-muted/20 rounded-lg p-3 text-center">
                      <p className={`text-lg font-bold font-mono ${color}`}>{value}</p>
                      <p className="text-[10px] text-muted-foreground uppercase font-mono mt-0.5">{label}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* URL check strip */}
              <div className="mt-4 flex flex-wrap gap-2">
                {[
                  { label: "URL Live", ok: report.meta.urlReachable },
                  { label: "Mobile Viewport", ok: report.meta.hasViewport },
                  { label: "Privacy Policy", ok: report.meta.hasPrivacyLink },
                ].map(({ label, ok }) => (
                  <span
                    key={label}
                    className={`inline-flex items-center gap-1 text-[11px] font-mono px-2 py-1 rounded-full border ${
                      ok === true ? "border-green-500/30 bg-green-950/20 text-green-400"
                      : ok === false ? "border-red-500/30 bg-red-950/20 text-red-400"
                      : "border-border text-muted-foreground"
                    }`}
                  >
                    {ok === true ? <CheckCircle2 className="h-3 w-3" /> : ok === false ? <AlertCircle className="h-3 w-3" /> : null}
                    {label}
                  </span>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Next Actions */}
          {report.nextActions.length > 0 && (
            <Card className="bg-card border-violet-500/20">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-mono uppercase tracking-widest text-violet-400">Next Best Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {report.nextActions.map((action, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <span className="text-[11px] font-mono bg-violet-500/20 text-violet-400 rounded-full w-5 h-5 flex items-center justify-center shrink-0 mt-0.5">{i + 1}</span>
                    <p className="text-sm text-muted-foreground leading-snug">{action}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Findings by severity */}
          <div className="space-y-5">
            <SectionGroup title="Blockers" findings={report.blockers} defaultOpen={true} />
            <SectionGroup title="High Risk" findings={report.highRisk} defaultOpen={true} />
            <SectionGroup title="Medium" findings={report.medium} defaultOpen={false} />
          </div>

          {report.blockers.length === 0 && report.highRisk.length === 0 && report.medium.length === 0 && (
            <Card className="bg-green-950/20 border-green-500/30">
              <CardContent className="py-6 flex items-center gap-3">
                <CheckCircle2 className="h-6 w-6 text-green-400 shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-green-400">No issues detected</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Your app looks submission-ready. Trigger a build in the Wrap tab.</p>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
