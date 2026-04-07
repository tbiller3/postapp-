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
import { Download, CheckCircle2, Loader2, ExternalLink } from "lucide-react";
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
          <DialogTitle className="font-mono text-lg">Workspace Apps</DialogTitle>
          <p className="text-sm text-muted-foreground font-mono mt-1">
            Apps detected in this Replit project. Click to add them to your tracking list.
          </p>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : workspaceApps && workspaceApps.length === 0 ? (
          <p className="text-muted-foreground text-sm text-center py-6">No apps found in workspace.</p>
        ) : (
          <div className="space-y-4 mt-2">
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
      </DialogContent>
    </Dialog>
  );
}
