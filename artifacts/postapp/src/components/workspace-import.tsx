import { useState } from "react";
import {
  useListWorkspaceApps,
  useCreateApp,
  getListAppsQueryKey,
  getGetAppsSummaryQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Download, CheckCircle2, Loader2, ExternalLink, BookOpen, FolderOpen, MousePointerClick, Link2, ClipboardList } from "lucide-react";
import { useLocation } from "wouter";

const KIND_LABELS: Record<string, string> = {
  web: "Web App",
  mobile: "Mobile App",
  api: "API Server",
  design: "Design Canvas",
  slides: "Slides",
  video: "Video",
};

const KIND_PLATFORM: Record<string, string> = {
  mobile: "Both",
  web: "Both",
  api: "iOS",
  design: "iOS",
  slides: "iOS",
  video: "iOS",
};

const HOW_TO_STEPS = [
  {
    icon: FolderOpen,
    title: "Apps in this project",
    description:
      'Use the "Import" tab to pull in any app that was built inside this Replit project. They are detected automatically — just click Import next to the one you want.',
  },
  {
    icon: Link2,
    title: "Apps in other Replit projects",
    description:
      'Open the other Replit project from your Replit home screen. Copy the URL from your browser (e.g. https://replit.com/@YourName/my-app). Then click "New Submission" in POSTAPP and paste the URL into the "Replit Project URL" field.',
  },
  {
    icon: MousePointerClick,
    title: "Fill in the details",
    description:
      "Give the app a name, choose its platform (iOS, Android, or Both), set a version number, and pick a category. These details appear on the submission checklist and help you stay organized.",
  },
  {
    icon: ClipboardList,
    title: "Work through the checklist",
    description:
      "Once imported, each app gets a 17-item App Store submission checklist automatically. Open the app, go to the Operations Checklist tab, and tick off items as you complete them.",
  },
  {
    icon: CheckCircle2,
    title: "Track revision feedback",
    description:
      'If Apple rejects your app, open the Review Logs tab and add a note with source set to "Apple Review". You can track every round of feedback and mark issues resolved as you fix them.',
  },
];

export function WorkspaceImport() {
  const [open, setOpen] = useState(false);
  const [importing, setImporting] = useState<string | null>(null);
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const createApp = useCreateApp();

  const { data: workspaceApps, isLoading } = useListWorkspaceApps({
    query: { enabled: open },
  });

  function handleImport(app: NonNullable<typeof workspaceApps>[number]) {
    setImporting(app.slug);
    createApp.mutate(
      {
        data: {
          name: app.title,
          platform: KIND_PLATFORM[app.kind] ?? "iOS",
          status: "draft",
          bundleId: app.slug,
          description: `Imported from Replit workspace. Kind: ${KIND_LABELS[app.kind] ?? app.kind}. Preview path: ${app.previewPath}`,
          version: "1.0.0",
          category: KIND_LABELS[app.kind] ?? "Other",
        },
      },
      {
        onSuccess: (created) => {
          toast({
            title: "App Imported",
            description: `${app.title} has been added to your tracking list.`,
          });
          queryClient.invalidateQueries({ queryKey: getListAppsQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetAppsSummaryQueryKey() });
          setImporting(null);
          setOpen(false);
          setLocation(`/apps/${created.id}`);
        },
        onError: () => {
          toast({
            title: "Import Failed",
            description: `Could not import ${app.title}.`,
            variant: "destructive",
          });
          setImporting(null);
        },
      }
    );
  }

  const importable = workspaceApps?.filter((a) => !a.alreadyImported) ?? [];
  const alreadyIn = workspaceApps?.filter((a) => a.alreadyImported) ?? [];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          data-testid="button-import-workspace"
          className="font-mono uppercase tracking-wider text-xs border-primary/30 hover:border-primary"
        >
          <Download className="mr-2 h-4 w-4" />
          Import from Workspace
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg bg-card border-border">
        <DialogHeader>
          <DialogTitle className="font-mono text-lg">Import Apps</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="import" className="mt-1">
          <TabsList className="w-full bg-muted/30 border border-border rounded-lg p-1">
            <TabsTrigger
              value="import"
              data-testid="tab-import"
              className="flex-1 font-mono text-xs uppercase tracking-wider data-[state=active]:bg-primary/10 data-[state=active]:text-primary"
            >
              <Download className="mr-1.5 h-3 w-3" />
              Import
            </TabsTrigger>
            <TabsTrigger
              value="how-to"
              data-testid="tab-how-to"
              className="flex-1 font-mono text-xs uppercase tracking-wider data-[state=active]:bg-primary/10 data-[state=active]:text-primary"
            >
              <BookOpen className="mr-1.5 h-3 w-3" />
              How to Import
            </TabsTrigger>
          </TabsList>

          <TabsContent value="import" className="mt-4">
            <p className="text-sm text-muted-foreground font-mono mb-4">
              Apps detected in this Replit project. Click Import to start tracking one.
            </p>

            {isLoading ? (
              <div className="flex items-center justify-center py-10">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : workspaceApps && workspaceApps.length === 0 ? (
              <p className="text-muted-foreground text-sm text-center py-6">No apps found in workspace.</p>
            ) : (
              <div className="space-y-4">
                {importable.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-mono text-muted-foreground uppercase tracking-wider">Available to Import</p>
                    {importable.map((app) => (
                      <div
                        key={app.slug}
                        data-testid={`workspace-app-${app.slug}`}
                        className="flex items-center justify-between p-3 rounded-lg border border-border/50 bg-background/50 hover:border-primary/40 transition-colors"
                      >
                        <div className="space-y-0.5">
                          <div className="font-semibold text-sm">{app.title}</div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-mono text-muted-foreground px-1.5 py-0.5 rounded bg-muted/30 border border-border/50">
                              {KIND_LABELS[app.kind] ?? app.kind}
                            </span>
                            <span className="text-xs font-mono text-muted-foreground opacity-60 flex items-center gap-1">
                              <ExternalLink className="h-3 w-3" />
                              {app.previewPath}
                            </span>
                          </div>
                        </div>
                        <Button
                          size="sm"
                          onClick={() => handleImport(app)}
                          disabled={importing === app.slug}
                          data-testid={`button-import-${app.slug}`}
                          className="font-mono text-xs uppercase tracking-wider ml-3 shrink-0"
                        >
                          {importing === app.slug ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            "Import"
                          )}
                        </Button>
                      </div>
                    ))}
                  </div>
                )}

                {alreadyIn.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-mono text-muted-foreground uppercase tracking-wider">Already Tracking</p>
                    {alreadyIn.map((app) => (
                      <div
                        key={app.slug}
                        className="flex items-center justify-between p-3 rounded-lg border border-border/30 bg-background/20 opacity-60"
                      >
                        <div className="space-y-0.5">
                          <div className="font-semibold text-sm">{app.title}</div>
                          <span className="text-xs font-mono text-muted-foreground px-1.5 py-0.5 rounded bg-muted/20">
                            {KIND_LABELS[app.kind] ?? app.kind}
                          </span>
                        </div>
                        <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0 ml-3" />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </TabsContent>

          <TabsContent value="how-to" className="mt-4">
            <p className="text-sm text-muted-foreground mb-4">
              There are two ways to bring your apps into POSTAPP. Follow the steps that match your situation.
            </p>
            <div className="space-y-4">
              {HOW_TO_STEPS.map((step, index) => {
                const Icon = step.icon;
                return (
                  <div
                    key={index}
                    data-testid={`how-to-step-${index + 1}`}
                    className="flex gap-3 p-3 rounded-lg border border-border/40 bg-background/30"
                  >
                    <div className="shrink-0 mt-0.5 flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 border border-primary/20">
                      <Icon className="h-3.5 w-3.5 text-primary" />
                    </div>
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono text-primary/60 uppercase tracking-wider">Step {index + 1}</span>
                      </div>
                      <p className="text-sm font-semibold leading-snug">{step.title}</p>
                      <p className="text-xs text-muted-foreground leading-relaxed">{step.description}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
