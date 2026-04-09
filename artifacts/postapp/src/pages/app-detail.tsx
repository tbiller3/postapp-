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
import { ArrowLeft, ShieldAlert, CheckSquare, MessageSquare, ExternalLink, FileText, RefreshCw, ChevronsDown, AppWindow, CheckCircle2, XCircle, BarChart2, ListChecks, ImageIcon, Smartphone } from "lucide-react";
import { format } from "date-fns";
import { AssetsPanel } from "@/components/assets-panel";
import { AiAssistant } from "@/components/ai-assistant";
import { WrapTab } from "@/components/wrap-tab";
import { AnalyzeTab } from "@/components/analyze-tab";

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

  const [activeTab, setActiveTab] = useState("checklist");
  const [filterMode, setFilterMode] = useState<FilterMode>("all");
  const [isSavingSubmission, setIsSavingSubmission] = useState(false);
  const [syncPulse, setSyncPulse] = useState(false);
  const [resolvingIds, setResolvingIds] = useState<Set<number>>(new Set());
  const [reviewNotes, setReviewNotes] = useState("");
  const [isSavingReviewNotes, setIsSavingReviewNotes] = useState(false);

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

      <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-4">
        {/* Tab bar — scrolls horizontally on mobile, wraps on desktop */}
        <div className="overflow-x-auto scrollbar-none -mx-1 px-1">
          <TabsList className="bg-card border border-border rounded-lg p-1 h-auto gap-0.5 flex flex-nowrap w-max sm:w-full sm:flex-wrap">
            <TabsTrigger value="checklist" className="font-mono text-xs uppercase py-2 px-3 sm:px-4 data-[state=active]:bg-primary/10 data-[state=active]:text-primary whitespace-nowrap">
              <CheckSquare className="h-3.5 w-3.5 sm:mr-2 shrink-0" />
              <span className="hidden sm:inline">Operations Checklist</span>
              <span className="sm:hidden">Checklist</span>
              {!isLoadingChecklist && totalItems > 0 && (
                <span className="ml-1.5 font-mono text-[10px] bg-muted/50 text-muted-foreground px-1.5 py-0.5 rounded-full">
                  {completedItems}/{totalItems}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="submission" className="font-mono text-xs uppercase py-2 px-3 sm:px-4 data-[state=active]:bg-violet-500/10 data-[state=active]:text-violet-400 whitespace-nowrap">
              <FileText className="h-3.5 w-3.5 sm:mr-2 shrink-0" />
              <span className="hidden sm:inline">Submission Data</span>
              <span className="sm:hidden">Submission</span>
            </TabsTrigger>
            <TabsTrigger value="revisions" className="font-mono text-xs uppercase py-2 px-3 sm:px-4 data-[state=active]:bg-amber-500/10 data-[state=active]:text-amber-500 whitespace-nowrap">
              <ShieldAlert className="h-3.5 w-3.5 sm:mr-2 shrink-0" />
              <span className="hidden sm:inline">Review Logs</span>
              <span className="sm:hidden">Reviews</span>
            </TabsTrigger>
            <TabsTrigger value="assets" className="font-mono text-xs uppercase py-2 px-3 sm:px-4 data-[state=active]:bg-blue-500/10 data-[state=active]:text-blue-400 whitespace-nowrap">
              <ImageIcon className="h-3.5 w-3.5 sm:mr-2 shrink-0" />
              <span className="hidden sm:inline">Assets</span>
              <span className="sm:hidden">Assets</span>
            </TabsTrigger>
            <TabsTrigger value="apple" className="font-mono text-xs uppercase py-2 px-3 sm:px-4 data-[state=active]:bg-green-500/10 data-[state=active]:text-green-400 whitespace-nowrap">
              <AppWindow className="h-3.5 w-3.5 sm:mr-2 shrink-0" />
              <span className="hidden sm:inline">Apple Connect</span>
              <span className="sm:hidden">Connect</span>
            </TabsTrigger>
            <TabsTrigger value="wrap" className="font-mono text-xs uppercase py-2 px-3 sm:px-4 data-[state=active]:bg-purple-500/10 data-[state=active]:text-purple-400 whitespace-nowrap">
              <Smartphone className="h-3.5 w-3.5 sm:mr-2 shrink-0" />
              <span className="hidden sm:inline">Native Wrap</span>
              <span className="sm:hidden">Wrap</span>
            </TabsTrigger>
            <TabsTrigger value="analyze" className="font-mono text-xs uppercase py-2 px-3 sm:px-4 data-[state=active]:bg-violet-500/10 data-[state=active]:text-violet-400 whitespace-nowrap">
              <BarChart2 className="h-3.5 w-3.5 sm:mr-2 shrink-0" />
              <span className="hidden sm:inline">V25 Analyze</span>
              <span className="sm:hidden">Analyze</span>
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="checklist" className="mt-6">
          {isLoadingChecklist ? (
            <Skeleton className="h-64 w-full rounded-xl bg-card border border-border" />
          ) : (
            <>
              {/* Filter bar */}
              <div className="flex items-center gap-2 mb-5">
                {(["all", "critical", "review"] as const).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => setFilterMode(mode)}
                    className={`px-3 py-1.5 rounded-md text-[11px] font-mono font-semibold uppercase tracking-wider border transition-colors ${
                      filterMode === mode
                        ? mode === "critical"
                          ? "bg-red-500/10 border-red-500/30 text-red-400"
                          : mode === "review"
                            ? "bg-amber-500/10 border-amber-500/30 text-amber-400"
                            : "bg-primary/10 border-primary/30 text-primary"
                        : "bg-transparent border-border/50 text-muted-foreground hover:border-border hover:text-foreground"
                    }`}
                  >
                    {mode === "all" && `All · ${enrichedChecklist.length}`}
                    {mode === "critical" && `Critical · ${blockers.length}`}
                    {mode === "review" && `Needs Review · ${enrichedChecklist.filter((i) => !i.blocker && !i.completed).length}`}
                  </button>
                ))}
              </div>

              {/* Fix This Next panel */}
              {filterMode !== "review" && (
                <FixPanel
                  blockers={blockers}
                  fieldIssues={fieldIssues}
                  onInternalNav={(target) => setActiveTab(target)}
                />
              )}

              {/* Grouped sections */}
              {Object.keys(groupedChecklist).length > 0 ? (
                <div className="space-y-4">
                  {Object.entries(groupedChecklist).map(([category, items]) => {
                    const done = items.filter((i) => i.completed).length;
                    return (
                      <Card key={category} className="bg-card border-border shadow-sm overflow-hidden">
                        <CardHeader className="bg-muted/20 border-b border-border py-3 px-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div className={`w-1.5 h-4 rounded-full ${SECTION_ACCENTS[category] ?? "bg-muted"}`} />
                              <CardTitle className={`text-xs font-mono uppercase tracking-wider ${SECTION_TEXT_ACCENTS[category] ?? "text-muted-foreground"}`}>
                                {category}
                              </CardTitle>
                            </div>
                            <span className="text-xs font-mono text-muted-foreground">
                              {done}/{items.length}
                            </span>
                          </div>
                        </CardHeader>
                        <CardContent className="p-0">
                          <div className="divide-y divide-border/50">
                            {items.map((item) => (
                              <ChecklistItemCard
                                key={item.id}
                                id={item.id}
                                label={item.label}
                                completed={item.completed}
                                status={item.status}
                                blocker={item.blocker}
                                helpText={item.helpText}
                                actions={item.actions}
                                fieldKey={item.fieldKey}
                                onToggle={handleChecklistToggle}
                                onInternalNav={(target) => setActiveTab(target)}
                              />
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center p-12 border border-dashed border-border rounded-lg bg-card/20">
                  <p className="text-muted-foreground text-sm">No items match this filter.</p>
                </div>
              )}
            </>
          )}
        </TabsContent>

        <TabsContent value="submission" className="mt-6 space-y-6">
          <SubmissionEditor onSave={handleSaveSubmission} isSaving={isSavingSubmission} onReset={handleResetSubmission} />

          {/* Reviewer Notes */}
          <Card className="bg-card border-border">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between gap-3">
                <CardTitle className="text-sm font-mono uppercase tracking-wider flex items-center gap-2">
                  <MessageSquare className="h-4 w-4 text-violet-400" />
                  Notes for Reviewer
                </CardTitle>
                <span className="text-[10px] font-mono text-muted-foreground border border-border px-2 py-0.5 rounded">
                  App Store Connect → Notes
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                This text goes in the "Notes" field when you submit for review. Explain navigation, optional features, and anything the reviewer should know.
              </p>
            </CardHeader>
            <CardContent className="space-y-3">
              <Textarea
                value={reviewNotes}
                onChange={(e) => setReviewNotes(e.target.value)}
                placeholder="Describe how to navigate the app, any special features, test accounts, or optional functionality the reviewer should know about..."
                className="font-mono text-sm min-h-[160px] resize-y bg-background/50"
              />
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono text-muted-foreground">
                  {reviewNotes.length} chars
                </span>
                <Button
                  size="sm"
                  onClick={handleSaveReviewNotes}
                  disabled={isSavingReviewNotes}
                  className="font-mono text-xs"
                >
                  {isSavingReviewNotes ? "Saving…" : "Save Notes"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="revisions" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-4">
              {isLoadingRevisions ? (
                <Skeleton className="h-32 w-full rounded-xl" />
              ) : revisions && revisions.length > 0 ? (
                revisions.map((rev) => {
                  const isResolving = resolvingIds.has(rev.id);
                  const sourceColor = rev.source === 'Apple Review'
                    ? 'border-l-amber-500'
                    : rev.source === 'Tester'
                    ? 'border-l-purple-500'
                    : 'border-l-blue-500';
                  return (
                    <Card key={rev.id} className={`border-border border-l-4 ${sourceColor} ${rev.resolved ? 'opacity-60' : ''} transition-opacity`}>
                      <CardHeader className="py-3 px-4 flex flex-row items-center justify-between bg-muted/20">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className={`font-mono text-[10px] ${
                            rev.source === 'Apple Review' ? 'text-amber-500 border-amber-500/30'
                            : rev.source === 'Tester' ? 'text-purple-400 border-purple-400/30'
                            : 'text-blue-400 border-blue-400/30'
                          }`}>
                            {rev.source}
                          </Badge>
                          <span className="text-xs text-muted-foreground font-mono">
                            {format(new Date(rev.createdAt), "MMM d, HH:mm")}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          {rev.resolved ? (
                            <span className="text-xs font-mono text-green-500 border border-green-500/30 bg-green-500/10 px-2 py-0.5 rounded flex items-center gap-1">
                              <CheckCircle2 className="h-3 w-3" />RESOLVED
                            </span>
                          ) : (
                            <span className="text-xs font-mono text-amber-500 border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 rounded">ACTIVE</span>
                          )}
                          <button
                            onClick={() => handleResolveRevision(rev.id, !rev.resolved)}
                            disabled={isResolving}
                            className={`text-[10px] font-mono px-2 py-0.5 rounded border transition-all ${
                              rev.resolved
                                ? 'text-muted-foreground border-border hover:border-amber-500/40 hover:text-amber-400'
                                : 'text-green-400 border-green-500/20 bg-green-500/5 hover:bg-green-500/15'
                            } disabled:opacity-40`}
                          >
                            {isResolving ? '…' : rev.resolved ? 'Reopen' : 'Resolve'}
                          </button>
                        </div>
                      </CardHeader>
                      <CardContent className="p-4">
                        <p className="text-sm whitespace-pre-wrap font-sans leading-relaxed">{rev.note}</p>
                      </CardContent>
                    </Card>
                  );
                })
              ) : (
                <div className="text-center p-12 border border-dashed border-border rounded-lg bg-card/20">
                  <ShieldAlert className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                  <h3 className="text-lg font-medium">No log entries</h3>
                  <p className="text-sm text-muted-foreground mt-1">Add a revision or feedback note to track progress.</p>
                </div>
              )}
            </div>

            <div className="space-y-4">
              {/* Pre-submission readiness card */}
              <PreSubmissionCard revisions={revisions ?? []} checklist={checklist ?? []} />

              {/* New entry form */}
              <Card className="bg-card border-border sticky top-4">
                <CardHeader>
                  <CardTitle className="text-sm font-mono uppercase tracking-wider flex items-center gap-2">
                    <MessageSquare className="h-4 w-4" />
                    New Log Entry
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Form {...revisionForm}>
                    <form onSubmit={revisionForm.handleSubmit(onRevisionSubmit)} className="space-y-4">
                      <FormField
                        control={revisionForm.control}
                        name="source"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="font-mono text-xs uppercase text-muted-foreground">Source</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger className="font-mono text-sm">
                                  <SelectValue placeholder="Source" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="Internal">Internal Note</SelectItem>
                                <SelectItem value="Apple Review">Apple Review</SelectItem>
                                <SelectItem value="Tester">Tester Feedback</SelectItem>
                              </SelectContent>
                            </Select>
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={revisionForm.control}
                        name="note"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="font-mono text-xs uppercase text-muted-foreground">Log Content</FormLabel>
                            <FormControl>
                              <Textarea 
                                placeholder="Enter feedback details..." 
                                className="min-h-[120px] resize-none text-sm" 
                                {...field} 
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <Button type="submit" disabled={createRevision.isPending} className="w-full font-mono text-xs uppercase tracking-wider">
                        {createRevision.isPending ? "Recording..." : "Record Entry"}
                      </Button>
                    </form>
                  </Form>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="assets" className="mt-6">
          <AssetsPanel appId={appId} />
        </TabsContent>

        <TabsContent value="apple" className="mt-6">
          <AppleConnectPanel />
        </TabsContent>

        <TabsContent value="wrap" className="mt-6">
          {app && (
            <WrapTab
              appId={appId}
              app={{ name: app.name, bundleId: app.bundleId, replitUrl: app.replitUrl }}
              onChecklistRefresh={() => queryClient.invalidateQueries({ queryKey: getGetChecklistQueryKey(appId) })}
            />
          )}
        </TabsContent>

        <TabsContent value="analyze" className="mt-6">
          <AnalyzeTab appId={appId} />
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
