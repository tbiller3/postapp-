import { Link } from "wouter";
import { useListApps, useGetAppsSummary } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, AppWindow, AlertCircle, CheckCircle2, Clock, PlayCircle } from "lucide-react";
import { StatusBadge } from "@/components/status-badge";
import { Skeleton } from "@/components/ui/skeleton";
import { WorkspaceImport } from "@/components/workspace-import";
import { AiAssistant } from "@/components/ai-assistant";

type AppWithProgress = {
  id: number;
  name: string;
  platform: string;
  status: string;
  version?: string | null;
  bundleId?: string | null;
  checklistTotal?: number;
  checklistDone?: number;
};

export default function Dashboard() {
  const { data: apps, isLoading: isLoadingApps } = useListApps();
  const { data: summary, isLoading: isLoadingSummary } = useGetAppsSummary();

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Mission Control</h1>
          <p className="text-muted-foreground mt-1 font-mono text-sm">Overview of all active App Store submissions</p>
        </div>
        <div className="flex items-center gap-2">
          <WorkspaceImport />
          <Link href="/apps/new">
            <Button className="font-mono uppercase tracking-wider text-xs" data-testid="button-add-application">
              <Plus className="mr-2 h-4 w-4" />
              Add Application
            </Button>
          </Link>
        </div>
      </div>

      {isLoadingSummary ? (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-28 w-full rounded-xl bg-muted/50" />
          ))}
        </div>
      ) : summary ? (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card className="bg-card/50 border-border/50">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-mono font-medium text-muted-foreground">TOTAL</CardTitle>
              <AppWindow className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary.total}</div>
            </CardContent>
          </Card>
          <Card className="bg-blue-500/5 border-blue-500/20">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-mono font-medium text-blue-400">IN REVIEW</CardTitle>
              <Clock className="h-4 w-4 text-blue-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-400">{summary.inReview}</div>
            </CardContent>
          </Card>
          <Card className="bg-amber-500/5 border-amber-500/20">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-mono font-medium text-amber-500">REVISIONS</CardTitle>
              <AlertCircle className="h-4 w-4 text-amber-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-amber-500">{summary.needsRevision}</div>
            </CardContent>
          </Card>
          <Card className="bg-purple-500/5 border-purple-500/20">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-mono font-medium text-purple-400">READY</CardTitle>
              <PlayCircle className="h-4 w-4 text-purple-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-400">{summary.readyForSubmission}</div>
            </CardContent>
          </Card>
          <Card className="bg-green-500/5 border-green-500/20">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-mono font-medium text-green-500">APPROVED</CardTitle>
              <CheckCircle2 className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-500">{summary.approved}</div>
            </CardContent>
          </Card>
        </div>
      ) : null}

      <div className="space-y-4">
        <h2 className="text-xl font-semibold tracking-tight border-b border-border pb-2">Active Targets</h2>
        
        {isLoadingApps ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-24 w-full rounded-lg bg-muted/50" />
            ))}
          </div>
        ) : apps && apps.length > 0 ? (
          <div className="grid gap-3">
            {(apps as AppWithProgress[]).map((app) => {
              const total = app.checklistTotal ?? 0;
              const done = app.checklistDone ?? 0;
              const pct = total > 0 ? Math.round((done / total) * 100) : 0;
              const allDone = total > 0 && done === total;

              return (
                <Link key={app.id} href={`/apps/${app.id}`}>
                  <div className="group block rounded-lg border border-border/50 bg-card/40 p-4 hover:bg-card/80 hover:border-primary/50 transition-all cursor-pointer">
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-2 flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-lg">{app.name}</span>
                          <StatusBadge status={app.status} />
                          <span className="text-xs font-mono text-muted-foreground px-2 py-0.5 rounded bg-muted/30 border border-border/50">
                            {app.platform}
                          </span>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground font-mono">
                          <span>v{app.version || "1.0.0"}</span>
                          {app.bundleId && (
                            <span className="opacity-70 truncate">{app.bundleId}</span>
                          )}
                        </div>
                        {total > 0 && (
                          <div className="space-y-1">
                            <div className="flex items-center justify-between">
                              <span className="text-[11px] font-mono text-muted-foreground">
                                Checklist {done}/{total}
                              </span>
                              <span className={`text-[11px] font-mono font-semibold ${allDone ? "text-green-500" : pct >= 75 ? "text-amber-400" : "text-muted-foreground"}`}>
                                {pct}%
                              </span>
                            </div>
                            <div className="h-1.5 w-full rounded-full bg-muted/40 overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all duration-500 ${allDone ? "bg-green-500" : pct >= 75 ? "bg-amber-400" : "bg-primary"}`}
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          </div>
                        )}
                      </div>
                      <div className="text-muted-foreground/50 group-hover:text-primary transition-colors shrink-0 mt-1">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M5 12h14" /><path d="m12 5 7 7-7 7" />
                        </svg>
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="text-center p-12 border border-dashed border-border rounded-lg bg-card/20">
            <AppWindow className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-medium">No active targets</h3>
            <p className="text-sm text-muted-foreground mt-1 mb-4">Start by adding your first application submission.</p>
            <Link href="/apps/new">
              <Button variant="outline" className="font-mono uppercase text-xs">Initialize Target</Button>
            </Link>
          </div>
        )}
      </div>
      <AiAssistant />
    </div>
  );
}
