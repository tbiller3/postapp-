import { useParams, Link } from "wouter";
import { useState, useMemo } from "react";
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
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/status-badge";
import { ArrowLeft, Save, Trash2, ShieldAlert, CheckSquare, MessageSquare } from "lucide-react";
import { format } from "date-fns";

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

  const updateApp = useUpdateApp();
  const createRevision = useCreateRevision();
  const updateChecklistItem = useUpdateChecklistItem();

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

  // Group checklist by category
  const groupedChecklist = useMemo(() => {
    if (!checklist) return {};
    return checklist.reduce((acc, item) => {
      if (!acc[item.category]) acc[item.category] = [];
      acc[item.category].push(item);
      return acc;
    }, {} as Record<string, typeof checklist>);
  }, [checklist]);

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
            <span>•</span>
            <span>{app.bundleId}</span>
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

      <Tabs defaultValue="checklist" className="mt-8">
        <TabsList className="bg-card border border-border rounded-lg p-1 w-full justify-start h-auto">
          <TabsTrigger value="checklist" className="font-mono text-xs uppercase py-2 px-4 data-[state=active]:bg-primary/10 data-[state=active]:text-primary">
            <CheckSquare className="mr-2 h-4 w-4" /> Operations Checklist
          </TabsTrigger>
          <TabsTrigger value="revisions" className="font-mono text-xs uppercase py-2 px-4 data-[state=active]:bg-amber-500/10 data-[state=active]:text-amber-500">
            <ShieldAlert className="mr-2 h-4 w-4" /> Review Logs
          </TabsTrigger>
        </TabsList>

        <TabsContent value="checklist" className="mt-6 space-y-6">
          {isLoadingChecklist ? (
            <Skeleton className="h-64 w-full rounded-xl bg-card border border-border" />
          ) : Object.keys(groupedChecklist).length > 0 ? (
            Object.entries(groupedChecklist).map(([category, items]) => (
              <Card key={category} className="bg-card border-border shadow-sm overflow-hidden">
                <CardHeader className="bg-muted/30 border-b border-border py-3">
                  <CardTitle className="text-sm font-mono uppercase tracking-wider">{category}</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="divide-y divide-border">
                    {items.map((item) => (
                      <div key={item.id} className="flex items-center gap-3 p-4 hover:bg-muted/10 transition-colors">
                        <Checkbox 
                          id={`check-${item.id}`} 
                          checked={item.completed}
                          onCheckedChange={(checked) => handleChecklistToggle(item.id, checked as boolean)}
                          className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                        />
                        <label 
                          htmlFor={`check-${item.id}`}
                          className={`text-sm font-medium leading-none cursor-pointer ${item.completed ? 'text-muted-foreground line-through opacity-70' : ''}`}
                        >
                          {item.label}
                        </label>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <div className="text-center p-12 border border-dashed border-border rounded-lg bg-card/20">
              <p className="text-muted-foreground">No checklist items defined.</p>
            </div>
          )}
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
