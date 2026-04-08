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
import { ArrowLeft, ShieldAlert, CheckSquare, MessageSquare, ExternalLink, FileText, RefreshCw, ChevronsDown, AppWindow } from "lucide-react";
import { format } from "date-fns";

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
      <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <Link href="/">
            <Button variant="ghost" size="sm" className="mb-2 font-mono text-xs uppercase tracking-wider text-muted-foreground hover:text-foreground">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
          </Link>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold tracking-tight">{app.name}</h1>
            <StatusBadge status={app.status} />
          </div>
          <div className="flex items-center gap-4 text-sm text-muted-foreground font-mono mt-2">
            <span>{app.platform}</span>
            <span>•</span>
            <span>v{app.version}</span>
            {app.bundleId && (
              <>
                <span>•</span>
                <span>{app.bundleId}</span>
              </>
            )}
            {app.replitUrl && (
              <>
                <span>•</span>
                <a
                  href={app.replitUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  data-testid="link-replit-project"
                  className="flex items-center gap-1 text-primary hover:underline transition-colors"
                >
                  <ExternalLink className="h-3 w-3" />
                  Open in Replit
                </a>
              </>
            )}
          </div>
        </div>
        
        <div className="flex items-center gap-2 bg-card border border-border p-1 rounded-md">
          <Select value={app.status} onValueChange={handleStatusChange}>
            <SelectTrigger className="w-[200px] border-none shadow-none focus:ring-0 font-mono text-xs font-semibold uppercase">
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

      {/* Persistent sync bar */}
      <div className="flex items-center gap-2 mt-6 px-4 py-2.5 rounded-xl border border-border/40 bg-muted/10 text-xs font-mono">
        <span className="text-muted-foreground/60 font-semibold uppercase tracking-wider mr-1">Submission Data</span>
        <span className="text-muted-foreground/30 mr-2">·</span>
        <button
          onClick={handleSyncFromBuild}
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border font-semibold transition-all ${
            syncPulse
              ? "bg-green-500/15 border-green-500/30 text-green-400"
              : "bg-blue-500/10 border-blue-500/20 text-blue-400 hover:bg-blue-500/20"
          }`}
          data-testid="sync-bar-sync"
        >
          <RefreshCw className={`h-3 w-3 ${syncPulse ? "animate-spin" : ""}`} />
          {syncPulse ? "Synced!" : "Sync From Build"}
        </button>
        <button
          onClick={() => {
            applyAllDetectedValues();
            toast({ title: "Detected Values Applied", description: "All detected fields have been filled in." });
          }}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-muted/30 border border-border/50 text-muted-foreground hover:text-foreground hover:border-border transition-colors font-semibold"
          data-testid="sync-bar-apply"
        >
          <ChevronsDown className="h-3 w-3" />
          Apply All Detected
        </button>
        <span className="ml-auto text-muted-foreground/40">
          {fieldIssues.filter(f => f.fieldStatus === "missing").length} missing · {fieldIssues.filter(f => f.fieldStatus === "modified").length} modified
        </span>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-4">
        <TabsList className="bg-card border border-border rounded-lg p-1 w-full justify-start h-auto flex-wrap gap-0.5">
          <TabsTrigger value="checklist" className="font-mono text-xs uppercase py-2 px-4 data-[state=active]:bg-primary/10 data-[state=active]:text-primary">
            <CheckSquare className="mr-2 h-4 w-4" /> Operations Checklist
            {!isLoadingChecklist && totalItems > 0 && (
              <span className="ml-2 font-mono text-[10px] bg-muted/50 text-muted-foreground px-1.5 py-0.5 rounded-full">
                {completedItems}/{totalItems}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="submission" className="font-mono text-xs uppercase py-2 px-4 data-[state=active]:bg-violet-500/10 data-[state=active]:text-violet-400">
            <FileText className="mr-2 h-4 w-4" /> Submission Data
          </TabsTrigger>
          <TabsTrigger value="revisions" className="font-mono text-xs uppercase py-2 px-4 data-[state=active]:bg-amber-500/10 data-[state=active]:text-amber-500">
            <ShieldAlert className="mr-2 h-4 w-4" /> Review Logs
          </TabsTrigger>
          <TabsTrigger value="apple" className="font-mono text-xs uppercase py-2 px-4 data-[state=active]:bg-green-500/10 data-[state=active]:text-green-400">
            <AppWindow className="mr-2 h-4 w-4" /> Apple Connect
          </TabsTrigger>
        </TabsList>

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

        <TabsContent value="submission" className="mt-6">
          <SubmissionEditor onSave={handleSaveSubmission} isSaving={isSavingSubmission} onReset={handleResetSubmission} />
        </TabsContent>

        <TabsContent value="revisions" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-4">
              {isLoadingRevisions ? (
                <Skeleton className="h-32 w-full rounded-xl" />
              ) : revisions && revisions.length > 0 ? (
                revisions.map((rev) => (
                  <Card key={rev.id} className={`border-border ${rev.source === 'Apple Review' ? 'border-l-4 border-l-amber-500' : 'border-l-4 border-l-blue-500'}`}>
                    <CardHeader className="py-3 px-4 flex flex-row items-center justify-between bg-muted/20">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className={`font-mono text-[10px] ${rev.source === 'Apple Review' ? 'text-amber-500 border-amber-500/30' : 'text-blue-400 border-blue-400/30'}`}>
                          {rev.source}
                        </Badge>
                        <span className="text-xs text-muted-foreground font-mono">
                          {format(new Date(rev.createdAt), "MMM d, HH:mm")}
                        </span>
                      </div>
                      {rev.resolved ? (
                        <span className="text-xs font-mono text-green-500 border border-green-500/30 bg-green-500/10 px-2 py-0.5 rounded">RESOLVED</span>
                      ) : (
                        <span className="text-xs font-mono text-amber-500 border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 rounded">ACTIVE</span>
                      )}
                    </CardHeader>
                    <CardContent className="p-4">
                      <p className="text-sm whitespace-pre-wrap font-sans leading-relaxed">{rev.note}</p>
                    </CardContent>
                  </Card>
                ))
              ) : (
                <div className="text-center p-12 border border-dashed border-border rounded-lg bg-card/20">
                  <ShieldAlert className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                  <h3 className="text-lg font-medium">No log entries</h3>
                  <p className="text-sm text-muted-foreground mt-1">Add a revision or feedback note to track progress.</p>
                </div>
              )}
            </div>

            <div>
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

        <TabsContent value="apple" className="mt-6">
          <AppleConnectPanel />
        </TabsContent>
      </Tabs>
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
