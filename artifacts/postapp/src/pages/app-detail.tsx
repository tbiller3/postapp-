import { useParams, Link } from "wouter";
import { useState, useMemo, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQueryClient } from "@tanstack/react-query";
import { 
  useGetApp, 
  getGetAppQueryKey,
  useUpdateApp,
  useListRevisions,
  getListRevisionsQueryKey,
  useCreateRevision,
  useGetChecklist,
  getGetChecklistQueryKey,
  useUpdateChecklistItem,
  getListAppsQueryKey,
  getGetAppsSummaryQueryKey
} from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/status-badge";
import { ChecklistItemCard } from "@/components/checklist-item-card";
import { FixPanel } from "@/components/fix-panel";
import { SubmissionEditor } from "@/components/submission-editor";
import { AppleConnectPanel } from "@/components/apple-connect-panel";
import { getItemMeta, ChecklistStatus, SECTION_ACCENTS, SECTION_TEXT_ACCENTS } from "@/data/checklist-meta";
import { useSubmissionStore, SubmissionFields, DetectedData } from "@/state/submission-store";
import { getFieldStatus } from "@/utils/source-sync";
import { FieldIssue } from "@/components/fix-panel";
import { ArrowLeft, LayoutDashboard, FileText, ImageIcon, Rocket, Settings2, MessageSquare, CheckSquare, ShieldAlert, AppWindow, Smartphone, BarChart2, RefreshCw, ChevronsDown, ExternalLink, CheckCircle2, XCircle, ListChecks } from "lucide-react";
import { format } from "date-fns";
import { AssetsPanel } from "@/components/assets-panel";
import { AiAssistant } from "@/components/ai-assistant";
import { WrapTab } from "@/components/wrap-tab";
import { AnalyzeTab } from "@/components/analyze-tab";
import { ScreenshotAutomator } from "@/components/screenshot-automator";
import { OverviewTab } from "@/components/overview-tab";
import { LaunchTab } from "@/components/launch-tab";
import { ReadinessBar } from "@/components/readiness-bar";

type FilterMode = "all" | "critical" | "review";

const revisionSchema = z.object({
  note: z.string().min(1, "Note is required"),
  source: z.string().min(1, "Source is required"),
});

export default function AppDetail() {
  const { id } = useParams();
  const appId = parseInt(id || "0", 10);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: app, isLoading: isLoadingApp } = useGetApp(appId, { query: { enabled: !!appId, queryKey: getGetAppQueryKey(appId) } });
  const { data: revisions, isLoading: isLoadingRevisions } = useListRevisions(appId, { query: { enabled: !!appId, queryKey: getListRevisionsQueryKey(appId) } });
  const { data: checklist, isLoading: isLoadingChecklist } = useGetChecklist(appId, { query: { enabled: !!appId, queryKey: getGetChecklistQueryKey(appId) } });

  const [activeTab, setActiveTab] = useState("overview");
  const [filterMode, setFilterMode] = useState<FilterMode>("all");
  const [isSavingSubmission, setIsSavingSubmission] = useState(false);
  const [syncPulse, setSyncPulse] = useState(false);
  const [resolvingIds, setResolvingIds] = useState<Set<number>>(new Set());
  const [reviewNotes, setReviewNotes] = useState("");
  const [isSavingReviewNotes, setIsSavingReviewNotes] = useState(false);
  // Review state — populated by StatusMonitor/OverviewTab via onRejected callback
  const [reviewState, setReviewState] = useState<string | null>(null);
  const [reviewVersion, setReviewVersion] = useState<string | null>(null);
  const [rejectionReasons, setRejectionReasons] = useState<string[]>([]);

  const { seedFromApp, reset, syncDetected, applyAllDetectedValues } = useSubmissionStore();
  const storeFields = useSubmissionStore((s) => s.fields);
  const storeDetected = useSubmissionStore((s) => s.detected);

  // Seed submission store from DB data when app loads, reset on unmount
  useEffect(() => {
    if (!app) return;
    seedFromApp({
      appName: app.name ?? "",
      subtitle: app.subtitle ?? "",
      bundleId: app.bundleId ?? "",
      version: app.version ?? "",
      buildNumber: app.buildNumber ?? "",
      description: app.description ?? "",
      category: app.category ?? "",
      ageRating: app.ageRating ?? "",
      keywords: app.keywords ?? "",
      supportUrl: app.supportUrl ?? "",
      privacyPolicyUrl: app.privacyPolicyUrl ?? "",
    });
    setReviewNotes(app.reviewNotes ?? "");
    return () => reset();
  }, [app?.id]);

  const updateApp = useUpdateApp();
  const createRevision = useCreateRevision();
  const updateChecklistItem = useUpdateChecklistItem();

  const handleSyncFromBuild = () => {
    if (!app) return;
    const current = useSubmissionStore.getState().fields;
    const detected: Record<string, string> = {};
    const fromApp: Record<string, string | null | undefined> = {
      appName: app.name,
      bundleId: app.bundleId,
      version: app.version,
      description: app.description,
      category: app.category,
    };
    (Object.keys(fromApp) as (keyof typeof fromApp)[]).forEach((k) => {
      if (fromApp[k]) detected[k] = fromApp[k] as string;
    });
    const manualKeys: (keyof typeof current)[] = [
      "subtitle", "buildNumber", "keywords", "supportUrl", "privacyPolicyUrl", "ageRating",
    ];
    manualKeys.forEach((k) => {
      if (current[k] && current[k].trim()) detected[k] = current[k];
    });
    syncDetected(detected as DetectedData);
    setSyncPulse(true);
    setTimeout(() => setSyncPulse(false), 1800);
    const count = Object.values(detected).filter(Boolean).length;
    toast({ title: "Build Synced", description: `${count} field${count !== 1 ? "s" : ""} detected from your app record.` });
  };

  const handleResolveRevision = async (revisionId: number, resolved: boolean) => {
    setResolvingIds((prev) => new Set(prev).add(revisionId));
    try {
      const res = await fetch(`/api/revisions/${revisionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resolved }),
      });
      if (!res.ok) throw new Error("Failed to update");
      await queryClient.invalidateQueries({ queryKey: getListRevisionsQueryKey(appId) });
      toast({ title: resolved ? "Revision Resolved" : "Revision Reopened", description: resolved ? "Marked as resolved." : "Marked as active again." });
    } catch {
      toast({ title: "Error", description: "Could not update revision status.", variant: "destructive" });
    } finally {
      setResolvingIds((prev) => { const s = new Set(prev); s.delete(revisionId); return s; });
    }
  };

  const handleResetSubmission = () => {
    if (!app) return;
    seedFromApp({
      appName: app.name ?? "",
      subtitle: app.subtitle ?? "",
      bundleId: app.bundleId ?? "",
      version: app.version ?? "",
      buildNumber: app.buildNumber ?? "",
      description: app.description ?? "",
      category: app.category ?? "",
      ageRating: app.ageRating ?? "",
      keywords: app.keywords ?? "",
      supportUrl: app.supportUrl ?? "",
      privacyPolicyUrl: app.privacyPolicyUrl ?? "",
    });
  };

  const handleSaveSubmission = async () => {
    const { fields } = useSubmissionStore.getState();
    setIsSavingSubmission(true);
    updateApp.mutate(
      {
        id: appId,
        data: {
          name: fields.appName || app?.name || "",
          bundleId: fields.bundleId || undefined,
          version: fields.version || undefined,
          buildNumber: fields.buildNumber || undefined,
          description: fields.description || undefined,
          category: fields.category || undefined,
          subtitle: fields.subtitle || undefined,
          ageRating: fields.ageRating || undefined,
          keywords: fields.keywords || undefined,
          supportUrl: fields.supportUrl || undefined,
          privacyPolicyUrl: fields.privacyPolicyUrl || undefined,
        },
      },
      {
        onSuccess: () => {
          toast({ title: "Submission Data Saved", description: "App metadata updated successfully." });
          queryClient.invalidateQueries({ queryKey: getGetAppQueryKey(appId) });
          setIsSavingSubmission(false);
        },
        onError: () => {
          toast({ title: "Save Failed", description: "Could not save submission data.", variant: "destructive" });
          setIsSavingSubmission(false);
        },
      },
    );
  };

  const handleSaveReviewNotes = () => {
    setIsSavingReviewNotes(true);
    updateApp.mutate(
      { id: appId, data: { reviewNotes } },
      {
        onSuccess: () => {
          toast({ title: "Review Notes Saved", description: "Reviewer notes updated successfully." });
          queryClient.invalidateQueries({ queryKey: getGetAppQueryKey(appId) });
          setIsSavingReviewNotes(false);
        },
        onError: () => {
          toast({ title: "Save Failed", description: "Could not save review notes.", variant: "destructive" });
          setIsSavingReviewNotes(false);
        },
      },
    );
  };

  const revisionForm = useForm<z.infer<typeof revisionSchema>>({
    resolver: zodResolver(revisionSchema),
    defaultValues: { note: "", source: "Internal" },
  });

  const handleStatusChange = (newStatus: string) => {
    updateApp.mutate({ id: appId, data: { status: newStatus } }, {
      onSuccess: () => {
        toast({ title: "Status Updated", description: `Target status changed to ${newStatus}` });
        queryClient.invalidateQueries({ queryKey: getGetAppQueryKey(appId) });
        queryClient.invalidateQueries({ queryKey: getListAppsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetAppsSummaryQueryKey() });
      }
    });
  };

  const handleChecklistToggle = (itemId: number, completed: boolean) => {
    updateChecklistItem.mutate({ itemId, data: { completed } }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetChecklistQueryKey(appId) });
      }
    });
  };

  const onRevisionSubmit = (data: z.infer<typeof revisionSchema>) => {
    createRevision.mutate({ id: appId, data }, {
      onSuccess: () => {
        toast({ title: "Log Entry Added", description: "Revision note recorded successfully." });
        revisionForm.reset({ note: "", source: "Internal" });
        queryClient.invalidateQueries({ queryKey: getListRevisionsQueryKey(appId) });
      }
    });
  };

  // Enrich checklist items with V25 metadata and compute derived status
  const enrichedChecklist = useMemo(() => {
    if (!checklist) return [];
    return checklist.map((item) => {
      const meta = getItemMeta(item.label);
      const status: ChecklistStatus = item.completed
        ? "complete"
        : meta.blocker
          ? "missing"
          : "warning";
      return { ...item, ...meta, status };
    });
  }, [checklist]);

  // Blockers = incomplete items with blocker:true
  const blockers = useMemo(
    () => enrichedChecklist.filter((i) => i.blocker && !i.completed),
    [enrichedChecklist],
  );

  const FIELD_LABELS: Record<keyof SubmissionFields, string> = {
    appName: "App Name", subtitle: "Subtitle", bundleId: "Bundle ID",
    version: "Version", buildNumber: "Build Number", description: "Description",
    keywords: "Keywords", supportUrl: "Support URL",
    privacyPolicyUrl: "Privacy Policy URL", category: "Category", ageRating: "Age Rating",
  };

  // Compute missing/modified submission fields for the Fix panel
  const fieldIssues: FieldIssue[] = useMemo(() => {
    const keys = Object.keys(storeFields) as (keyof SubmissionFields)[];
    return keys
      .map((k) => {
        const s = getFieldStatus(storeFields[k], storeDetected[k]);
        if (s === "missing") return { key: k, label: FIELD_LABELS[k], fieldStatus: "missing" as const };
        if (s === "modified") return { key: k, label: FIELD_LABELS[k], fieldStatus: "modified" as const };
        return null;
      })
      .filter((x): x is FieldIssue => x !== null);
  }, [storeFields, storeDetected]);

  // Apply filter then group by category
  const groupedChecklist = useMemo(() => {
    const filtered = enrichedChecklist.filter((item) => {
      if (filterMode === "critical") return item.blocker && !item.completed;
      if (filterMode === "review") return !item.blocker && !item.completed;
      return true;
    });
    return filtered.reduce(
      (acc, item) => {
        if (!acc[item.category]) acc[item.category] = [];
        acc[item.category].push(item);
        return acc;
      },
      {} as Record<string, typeof filtered>,
    );
  }, [enrichedChecklist, filterMode]);

  const totalItems = enrichedChecklist.length;
  const completedItems = enrichedChecklist.filter((i) => i.completed).length;

  if (isLoadingApp) {
    return <div className="space-y-4"><Skeleton className="h-12 w-1/3" /><Skeleton className="h-64 w-full" /></div>;
  }

  if (!app) return <div>App not found</div>;

  return (
    <div className="max-w-5xl mx-auto animate-in fade-in duration-500 pb-20">
      {/* Page header */}
      <div className="mb-6">
        <Link href="/">
          <Button variant="ghost" size="sm" className="mb-2 font-mono text-xs uppercase tracking-wider text-muted-foreground hover:text-foreground -ml-2">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
        </Link>
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight leading-tight">{app.name}</h1>
              <StatusBadge status={app.status} />
            </div>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs sm:text-sm text-muted-foreground font-mono mt-2">
              <span>{app.platform}</span>
              <span className="text-muted-foreground/30">·</span>
              <span>v{app.version}</span>
              {app.bundleId && (
                <>
                  <span className="text-muted-foreground/30 hidden sm:inline">·</span>
                  <span className="hidden sm:inline truncate max-w-[200px]">{app.bundleId}</span>
                </>
              )}
              {app.replitUrl && (
                <a
                  href={app.replitUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  data-testid="link-replit-project"
                  className="flex items-center gap-1 text-primary hover:underline transition-colors"
                >
                  <ExternalLink className="h-3 w-3" />
                  <span className="hidden sm:inline">Open in Replit</span>
                </a>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 bg-card border border-border p-1 rounded-md w-full sm:w-auto shrink-0">
            <Select value={app.status} onValueChange={handleStatusChange}>
              <SelectTrigger className="w-full sm:w-[180px] border-none shadow-none focus:ring-0 font-mono text-xs font-semibold uppercase">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="draft" className="font-mono text-xs uppercase">Draft</SelectItem>
                <SelectItem value="ready-for-submission" className="font-mono text-xs uppercase text-purple-400">Ready</SelectItem>
                <SelectItem value="in-review" className="font-mono text-xs uppercase text-blue-400">In Review</SelectItem>
                <SelectItem value="needs-revision" className="font-mono text-xs uppercase text-amber-500">Needs Revision</SelectItem>
                <SelectItem value="approved" className="font-mono text-xs uppercase text-green-500">Approved</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Persistent sync bar */}
      <div className="flex items-center gap-2 mt-4 px-3 py-2 rounded-xl border border-border/40 bg-muted/10 text-xs font-mono overflow-x-auto scrollbar-none">
        <span className="text-muted-foreground/60 font-semibold uppercase tracking-wider shrink-0">Fields</span>
        <span className="text-muted-foreground/30">·</span>
        <button
          onClick={handleSyncFromBuild}
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border font-semibold transition-all shrink-0 ${
            syncPulse
              ? "bg-green-500/15 border-green-500/30 text-green-400"
              : "bg-blue-500/10 border-blue-500/20 text-blue-400 hover:bg-blue-500/20"
          }`}
          data-testid="sync-bar-sync"
        >
          <RefreshCw className={`h-3 w-3 ${syncPulse ? "animate-spin" : ""}`} />
          <span className="hidden sm:inline">{syncPulse ? "Synced!" : "Sync From Build"}</span>
          <span className="sm:hidden">{syncPulse ? "Synced!" : "Sync"}</span>
        </button>
        <button
          onClick={() => {
            applyAllDetectedValues();
            toast({ title: "Detected Values Applied", description: "All detected fields have been filled in." });
          }}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-muted/30 border border-border/50 text-muted-foreground hover:text-foreground hover:border-border transition-colors font-semibold shrink-0"
          data-testid="sync-bar-apply"
        >
          <ChevronsDown className="h-3 w-3" />
          <span className="hidden sm:inline">Apply All Detected</span>
          <span className="sm:hidden">Apply All</span>
        </button>
        <span className="ml-auto text-muted-foreground/40 shrink-0 pl-2">
          <span className="hidden sm:inline">{fieldIssues.filter(f => f.fieldStatus === "missing").length} missing · {fieldIssues.filter(f => f.fieldStatus === "modified").length} modified</span>
          <span className="sm:hidden">{fieldIssues.filter(f => f.fieldStatus === "missing").length}↓ {fieldIssues.filter(f => f.fieldStatus === "modified").length}△</span>
        </span>
      </div>

      {/* Always-visible readiness bar */}
      <ReadinessBar
        missingFields={fieldIssues.filter(f => f.fieldStatus === "missing").length}
        blockers={blockers.length}
        onNavigate={setActiveTab}
      />

      <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-3">
        {/* 5-tab bar */}
        <TabsList className="bg-card border border-border rounded-xl p-1 h-auto gap-0.5 grid grid-cols-5 w-full">

          {/* 1 — Overview */}
          <TabsTrigger value="overview" className="font-mono text-xs uppercase py-2.5 px-2 data-[state=active]:bg-primary/10 data-[state=active]:text-primary rounded-lg whitespace-nowrap flex flex-col sm:flex-row items-center gap-1 sm:gap-2">
            <LayoutDashboard className="h-3.5 w-3.5 shrink-0" />
            <span className="text-[10px] sm:text-xs">Overview</span>
            {blockers.length > 0 && (
              <span className="text-[9px] font-bold bg-red-500/20 text-red-400 px-1.5 py-0.5 rounded-full leading-none">
                {blockers.length}
              </span>
            )}
          </TabsTrigger>

          {/* 2 — Metadata */}
          <TabsTrigger value="metadata" className="font-mono text-xs uppercase py-2.5 px-2 data-[state=active]:bg-violet-500/10 data-[state=active]:text-violet-400 rounded-lg whitespace-nowrap flex flex-col sm:flex-row items-center gap-1 sm:gap-2">
            <FileText className="h-3.5 w-3.5 shrink-0" />
            <span className="text-[10px] sm:text-xs">Metadata</span>
            {fieldIssues.filter(f => f.fieldStatus === "missing").length > 0 && (
              <span className="text-[9px] font-bold bg-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded-full leading-none">
                {fieldIssues.filter(f => f.fieldStatus === "missing").length}
              </span>
            )}
          </TabsTrigger>

          {/* 3 — Screenshots */}
          <TabsTrigger value="screenshots" className="font-mono text-xs uppercase py-2.5 px-2 data-[state=active]:bg-blue-500/10 data-[state=active]:text-blue-400 rounded-lg whitespace-nowrap flex flex-col sm:flex-row items-center gap-1 sm:gap-2">
            <ImageIcon className="h-3.5 w-3.5 shrink-0" />
            <span className="text-[10px] sm:text-xs">Screenshots</span>
          </TabsTrigger>

          {/* 4 — Launch */}
          <TabsTrigger value="launch" className="font-mono text-xs uppercase py-2.5 px-2 data-[state=active]:bg-gradient-to-b data-[state=active]:from-violet-500/10 data-[state=active]:to-blue-500/10 data-[state=active]:text-violet-300 rounded-lg whitespace-nowrap flex flex-col sm:flex-row items-center gap-1 sm:gap-2 relative">
            <Rocket className="h-3.5 w-3.5 shrink-0" />
            <span className="text-[10px] sm:text-xs">Launch</span>
            {(reviewState === "REJECTED" || reviewState === "METADATA_REJECTED") && (
              <span className="text-[9px] font-bold bg-red-500/20 text-red-400 px-1.5 py-0.5 rounded-full leading-none">!</span>
            )}
            {!reviewState && <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-violet-500 animate-pulse" />}
          </TabsTrigger>

          {/* 5 — Settings */}
          <TabsTrigger value="settings" className="font-mono text-xs uppercase py-2.5 px-2 data-[state=active]:bg-muted/30 data-[state=active]:text-foreground rounded-lg whitespace-nowrap flex flex-col sm:flex-row items-center gap-1 sm:gap-2">
            <Settings2 className="h-3.5 w-3.5 shrink-0" />
            <span className="text-[10px] sm:text-xs">Settings</span>
          </TabsTrigger>

        </TabsList>

        {/* ── TAB 1: OVERVIEW ─────────────────────────────────────────── */}
        <TabsContent value="overview" className="mt-5">
          <OverviewTab
            appId={appId}
            appName={app?.name ?? ""}
            blockers={blockers.length}
            checklistComplete={completedItems}
            checklistTotal={totalItems}
            onNavigate={setActiveTab}
            onRejected={(status: unknown) => {
              const s = status as { state: string; versionString: string | null; rejectionReasons: string[] };
              setReviewState(s.state);
              setReviewVersion(s.versionString);
              setRejectionReasons(s.rejectionReasons ?? []);
              setActiveTab("launch");
            }}
          />
        </TabsContent>

        {/* ── TAB 2: METADATA ─────────────────────────────────────────── */}
        <TabsContent value="metadata" className="mt-5 space-y-6">
          <SubmissionEditor onSave={handleSaveSubmission} isSaving={isSavingSubmission} onReset={handleResetSubmission} />

          {/* Reviewer Notes — tucked at the bottom, out of the way */}
          <Card className="bg-card border-border">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between gap-3">
                <CardTitle className="text-sm font-mono uppercase tracking-wider flex items-center gap-2">
                  <MessageSquare className="h-4 w-4 text-violet-400" />
                  Notes for Reviewer
                </CardTitle>
                <span className="text-[10px] font-mono text-muted-foreground border border-border px-2 py-0.5 rounded">optional</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Sent to Apple when you submit. Explain login flows, special features, or anything the reviewer needs to know.
              </p>
            </CardHeader>
            <CardContent className="space-y-3">
              <Textarea
                value={reviewNotes}
                onChange={(e) => setReviewNotes(e.target.value)}
                placeholder="Describe how to navigate the app, demo credentials, optional features..."
                className="font-mono text-sm min-h-[120px] resize-y bg-background/50"
              />
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono text-muted-foreground/50">{reviewNotes.length} chars</span>
                <Button size="sm" onClick={handleSaveReviewNotes} disabled={isSavingReviewNotes} className="font-mono text-xs">
                  {isSavingReviewNotes ? "Saving…" : "Save"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── TAB 3: SCREENSHOTS ──────────────────────────────────────── */}
        <TabsContent value="screenshots" className="mt-5">
          <ScreenshotAutomator />
        </TabsContent>

        {/* ── TAB 4: LAUNCH ───────────────────────────────────────────── */}
        <TabsContent value="launch" className="mt-5">
          <LaunchTab
            reviewState={(reviewState as Parameters<typeof LaunchTab>[0]["reviewState"])}
            versionString={reviewVersion}
            rejectionReasons={rejectionReasons}
            onResubmit={() => {
              setReviewState(null);
            }}
          />
        </TabsContent>

        {/* ── TAB 5: SETTINGS ─────────────────────────────────────────── */}
        <TabsContent value="settings" className="mt-5 space-y-8">
          {/* Apple Connect */}
          <div className="space-y-3">
            <p className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground/50 flex items-center gap-2">
              <AppWindow className="h-3.5 w-3.5" /> Apple Connect
            </p>
            <AppleConnectPanel />
          </div>

          {/* Native Wrap / Build */}
          <div className="space-y-3 border-t border-border/30 pt-6">
            <p className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground/50 flex items-center gap-2">
              <Smartphone className="h-3.5 w-3.5" /> Native Wrap & Build
            </p>
            {app && (
              <WrapTab
                appId={appId}
                app={{ name: app.name, bundleId: app.bundleId, replitUrl: app.replitUrl }}
                onChecklistRefresh={() => queryClient.invalidateQueries({ queryKey: getGetChecklistQueryKey(appId) })}
              />
            )}
          </div>

          {/* Operations Checklist — full detail */}
          <div className="space-y-3 border-t border-border/30 pt-6">
            <p className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground/50 flex items-center gap-2">
              <CheckSquare className="h-3.5 w-3.5" /> Operations Checklist
            </p>
            {isLoadingChecklist ? (
              <Skeleton className="h-48 w-full rounded-xl bg-card border border-border" />
            ) : (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  {(["all", "critical", "review"] as const).map((mode) => (
                    <button
                      key={mode}
                      onClick={() => setFilterMode(mode)}
                      className={`px-3 py-1.5 rounded-md text-[11px] font-mono font-semibold uppercase tracking-wider border transition-colors ${
                        filterMode === mode
                          ? mode === "critical" ? "bg-red-500/10 border-red-500/30 text-red-400"
                          : mode === "review" ? "bg-amber-500/10 border-amber-500/30 text-amber-400"
                          : "bg-primary/10 border-primary/30 text-primary"
                          : "bg-transparent border-border/50 text-muted-foreground hover:border-border"
                      }`}
                    >
                      {mode === "all" && `All · ${enrichedChecklist.length}`}
                      {mode === "critical" && `Critical · ${blockers.length}`}
                      {mode === "review" && `Review · ${enrichedChecklist.filter(i => !i.blocker && !i.completed).length}`}
                    </button>
                  ))}
                </div>
                <FixPanel blockers={blockers} fieldIssues={fieldIssues} onInternalNav={setActiveTab} />
                {Object.entries(groupedChecklist).map(([category, items]) => {
                  const done = items.filter(i => i.completed).length;
                  return (
                    <Card key={category} className="bg-card border-border overflow-hidden">
                      <CardHeader className="bg-muted/20 border-b border-border py-3 px-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className={`w-1.5 h-4 rounded-full ${SECTION_ACCENTS[category] ?? "bg-muted"}`} />
                            <CardTitle className={`text-xs font-mono uppercase tracking-wider ${SECTION_TEXT_ACCENTS[category] ?? "text-muted-foreground"}`}>{category}</CardTitle>
                          </div>
                          <span className="text-xs font-mono text-muted-foreground">{done}/{items.length}</span>
                        </div>
                      </CardHeader>
                      <CardContent className="p-0">
                        <div className="divide-y divide-border/50">
                          {items.map(item => (
                            <ChecklistItemCard
                              key={item.id} id={item.id} label={item.label}
                              completed={item.completed} status={item.status} blocker={item.blocker}
                              helpText={item.helpText} actions={item.actions} fieldKey={item.fieldKey}
                              onToggle={handleChecklistToggle}
                              onInternalNav={setActiveTab}
                            />
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>

          {/* V25 Analyzer */}
          <div className="space-y-3 border-t border-border/30 pt-6">
            <p className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground/50 flex items-center gap-2">
              <BarChart2 className="h-3.5 w-3.5" /> V25 App Analyzer
            </p>
            <AnalyzeTab appId={appId} />
          </div>
        </TabsContent>
      </Tabs>

      <AiAssistant
        appId={appId}
        appContext={{
          appName: app.name ?? undefined,
          bundleId: app.bundleId ?? undefined,
          platform: app.platform ?? undefined,
          checklistTotal: totalItems,
          checklistDone: completedItems,
          pendingItems: enrichedChecklist
            .filter((i) => !i.completed)
            .map((i) => i.label)
            .slice(0, 10),
        }}
      />
    </div>
  );
}

function Badge({ children, variant, className }: { children: React.ReactNode, variant?: string, className?: string }) {
  return (
    <div className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 ${className}`}>
      {children}
    </div>
  )
}

type RevisionItem = { id: number; resolved: boolean; source: string };
type ChecklistItem = { id: number; status: string };

function PreSubmissionCard({ revisions, checklist }: { revisions: RevisionItem[]; checklist: ChecklistItem[] }) {
  const fields = useSubmissionStore((s) => s.fields);

  const activeRevisions = revisions.filter((r) => !r.resolved);
  const appleRejections = activeRevisions.filter((r) => r.source === "Apple Review");

  const requiredFields: { label: string; value: string | undefined | null }[] = [
    { label: "App Name", value: fields.appName },
    { label: "Bundle ID", value: fields.bundleId },
    { label: "Version", value: fields.version },
    { label: "Build #", value: fields.buildNumber },
    { label: "Description", value: fields.description },
    { label: "Keywords", value: fields.keywords },
    { label: "Support URL", value: fields.supportUrl },
    { label: "Privacy URL", value: fields.privacyPolicyUrl },
    { label: "Category", value: fields.category },
    { label: "Age Rating", value: fields.ageRating },
  ];
  const filledFields = requiredFields.filter((f) => f.value?.trim());
  const missingFields = requiredFields.filter((f) => !f.value?.trim());

  const checklistTotal = checklist.length;
  const checklistDone = checklist.filter((c) => c.status === "complete").length;
  const checklistPct = checklistTotal > 0 ? Math.round((checklistDone / checklistTotal) * 100) : 0;

  const isReady = appleRejections.length === 0 && missingFields.length === 0 && checklistPct === 100;
  const blockers = [
    ...appleRejections.length > 0 ? [`${appleRejections.length} unresolved Apple rejection${appleRejections.length > 1 ? 's' : ''}`] : [],
    ...missingFields.map((f) => `${f.label} missing`),
    ...checklistPct < 100 ? [`Checklist ${checklistPct}% complete`] : [],
  ];

  return (
    <Card className={`border ${isReady ? 'border-green-500/30 bg-green-500/5' : 'border-amber-500/20 bg-amber-500/5'}`}>
      <CardHeader className="py-3 px-4 border-b border-border/40">
        <CardTitle className="text-xs font-mono uppercase tracking-wider flex items-center gap-2 text-muted-foreground">
          <BarChart2 className="h-3.5 w-3.5" />
          Submission Readiness
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 space-y-3">
        {/* Verdict */}
        <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-mono font-semibold ${
          isReady
            ? 'bg-green-500/10 border-green-500/30 text-green-400'
            : 'bg-amber-500/10 border-amber-500/30 text-amber-400'
        }`}>
          {isReady ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
          {isReady ? 'Ready to Submit' : `${blockers.length} issue${blockers.length > 1 ? 's' : ''} blocking`}
        </div>

        {/* Blockers list */}
        {blockers.length > 0 && (
          <div className="space-y-1">
            {blockers.map((b) => (
              <div key={b} className="flex items-start gap-2 text-[11px] font-mono text-muted-foreground">
                <XCircle className="h-3 w-3 text-red-400 shrink-0 mt-0.5" />
                {b}
              </div>
            ))}
          </div>
        )}

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-2 pt-1">
          <div className="text-center p-2 rounded-lg bg-background/40 border border-border/30">
            <div className="text-base font-mono font-bold text-foreground">{filledFields.length}/{requiredFields.length}</div>
            <div className="text-[9px] font-mono uppercase tracking-wider text-muted-foreground/60 mt-0.5">Fields</div>
          </div>
          <div className="text-center p-2 rounded-lg bg-background/40 border border-border/30">
            <div className={`text-base font-mono font-bold ${checklistPct === 100 ? 'text-green-400' : 'text-foreground'}`}>{checklistPct}%</div>
            <div className="text-[9px] font-mono uppercase tracking-wider text-muted-foreground/60 mt-0.5">Checklist</div>
          </div>
          <div className="text-center p-2 rounded-lg bg-background/40 border border-border/30">
            <div className={`text-base font-mono font-bold ${appleRejections.length > 0 ? 'text-red-400' : 'text-green-400'}`}>{appleRejections.length}</div>
            <div className="text-[9px] font-mono uppercase tracking-wider text-muted-foreground/60 mt-0.5">Rejections</div>
          </div>
        </div>

        {/* Revision summary */}
        <div className="flex items-center justify-between text-[11px] font-mono text-muted-foreground/70 pt-1 border-t border-border/30">
          <div className="flex items-center gap-1.5">
            <ListChecks className="h-3 w-3" />
            {revisions.length} total log entries
          </div>
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="h-3 w-3 text-green-400" />
            {revisions.filter((r) => r.resolved).length} resolved
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
