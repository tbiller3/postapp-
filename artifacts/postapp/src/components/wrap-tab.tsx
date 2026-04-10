import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  Smartphone, Package, Cloud, Check, Copy, ChevronDown, ChevronRight,
  ExternalLink, Loader2, Zap, FileCode, Download, CheckCircle2, Globe,
  Github, Lock, Eye, EyeOff, Rocket
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

interface WrapConfig {
  webUrl: string;
  bundleId: string;
  appName: string;
  minIosVersion: string;
  backgroundColor: string;
  statusBarStyle: string;
  allowNavigation: string[];
  permissions: string[];
  codemagicAppId: string;
  githubRepoFullName: string;
}

interface GeneratedFile {
  name: string;
  content: string;
  language: string;
}

const IOS_VERSIONS = ["14.0", "15.0", "16.0", "17.0"];

const PERMISSION_OPTIONS = [
  { id: "camera", label: "Camera" },
  { id: "microphone", label: "Microphone" },
  { id: "location", label: "Location" },
  { id: "photos", label: "Photo Library" },
  { id: "push-notifications", label: "Push Notifications" },
  { id: "haptics", label: "Haptic Feedback" },
];

const STEPS = [
  { id: "configure", label: "Configure", icon: Smartphone },
  { id: "generate", label: "Generate", icon: Package },
  { id: "build", label: "Build", icon: Cloud },
];

interface Props {
  appId: number;
  app: {
    name?: string | null;
    bundleId?: string | null;
    replitUrl?: string | null;
  };
  onChecklistRefresh?: () => void;
}

export function WrapTab({ appId, app, onChecklistRefresh }: Props) {
  const { toast } = useToast();
  const [step, setStep] = useState<"configure" | "generate" | "build">("configure");
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [generatedFiles, setGeneratedFiles] = useState<GeneratedFile[]>([]);
  const [expandedFile, setExpandedFile] = useState<string | null>(null);
  const [copiedFile, setCopiedFile] = useState<string | null>(null);
  const [completingItems, setCompletingItems] = useState(false);
  const [githubOpen, setGithubOpen] = useState(false);
  const [githubToken, setGithubToken] = useState("");
  const [githubRepoName, setGithubRepoName] = useState("");
  const [githubPrivate, setGithubPrivate] = useState(true);
  const [githubPushing, setGithubPushing] = useState(false);
  const [githubRepoUrl, setGithubRepoUrl] = useState<string | null>(null);
  const [showToken, setShowToken] = useState(false);
  const [syncOpen, setSyncOpen] = useState(false);
  const [syncToken, setSyncToken] = useState("");
  const [syncRepoFullName, setSyncRepoFullName] = useState("tbiller3/wait-wise-ios");
  const [syncPushing, setSyncPushing] = useState(false);
  const [syncShowToken, setSyncShowToken] = useState(false);
  const [syncDone, setSyncDone] = useState(false);

  const [config, setConfig] = useState<WrapConfig>({
    webUrl: app.replitUrl || "",
    bundleId: app.bundleId || "",
    appName: app.name || "",
    minIosVersion: "15.0",
    backgroundColor: "#000000",
    statusBarStyle: "lightContent",
    allowNavigation: [],
    permissions: [],
    codemagicAppId: "",
    githubRepoFullName: "",
  });
  const [autoBuildStatus, setAutoBuildStatus] = useState<null | {
    status: string;
    buildId: string;
    codemagicUrl: string;
    steps: Array<{ name: string; status: string }>;
    ipaUrl: string | null;
  }>(null);
  const [autoBuildLoading, setAutoBuildLoading] = useState(false);

  // Load existing config
  useEffect(() => {
    fetch(`${BASE}/api/apps/${appId}/wrap`, { credentials: "include" })
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data) {
          setConfig({
            webUrl: data.webUrl,
            bundleId: data.bundleId,
            appName: data.appName,
            minIosVersion: data.minIosVersion,
            backgroundColor: data.backgroundColor,
            statusBarStyle: data.statusBarStyle,
            allowNavigation: data.allowNavigation || [],
            permissions: data.permissions || [],
            codemagicAppId: data.codemagicAppId || "",
            githubRepoFullName: data.githubRepoFullName || "",
          });
          if (data.lastBuildId && data.lastBuildStatus) {
            setAutoBuildStatus({
              status: data.lastBuildStatus,
              buildId: data.lastBuildId,
              codemagicUrl: `https://codemagic.io/app/${data.codemagicAppId}/build/${data.lastBuildId}`,
              steps: [],
              ipaUrl: null,
            });
          }
        }
      })
      .catch(() => {});
  }, [appId]);

  const togglePermission = (id: string) => {
    setConfig(c => ({
      ...c,
      permissions: c.permissions.includes(id)
        ? c.permissions.filter(p => p !== id)
        : [...c.permissions, id],
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`${BASE}/api/apps/${appId}/wrap`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(config),
      });
      if (!res.ok) throw new Error("Failed to save");
      toast({ title: "Configuration saved" });
      setStep("generate");
    } catch {
      toast({ title: "Save failed", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleAutoBuild = async () => {
    if (!config.githubRepoFullName) {
      toast({ title: "GitHub repo required", description: "Add your GitHub repo (owner/name) in Configure → save first.", variant: "destructive" });
      return;
    }
    setAutoBuildLoading(true);
    try {
      const res = await fetch(`${BASE}/api/apps/${appId}/wrap/trigger-build`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ repoFullName: config.githubRepoFullName }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Build trigger failed");
      setAutoBuildStatus({ status: "queued", buildId: data.buildId, codemagicUrl: data.codemagicUrl, steps: [], ipaUrl: null });
      toast({ title: "Build triggered!", description: "Files synced to GitHub and Codemagic build started." });
      // Start polling
      pollBuildStatus();
    } catch (err: any) {
      toast({ title: "Build failed to start", description: err.message, variant: "destructive" });
    } finally {
      setAutoBuildLoading(false);
    }
  };

  const pollBuildStatus = async () => {
    const poll = async () => {
      try {
        const res = await fetch(`${BASE}/api/apps/${appId}/wrap/build-status`, { credentials: "include" });
        if (!res.ok) return;
        const data = await res.json();
        setAutoBuildStatus(data);
        if (!["finished", "failed", "canceled"].includes(data.status)) {
          setTimeout(poll, 12000);
        }
      } catch {}
    };
    setTimeout(poll, 8000);
  };

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const res = await fetch(`${BASE}/api/apps/${appId}/wrap/generate`, {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to generate");
      const data = await res.json();
      setGeneratedFiles(data.files);
      setStep("build");
      toast({ title: "Project files generated", description: "Copy or download each file to set up your Xcode project." });
    } catch {
      toast({ title: "Generation failed", variant: "destructive" });
    } finally {
      setGenerating(false);
    }
  };

  const openGithubDialog = () => {
    setGithubRepoName(config.appName.toLowerCase().replace(/\s+/g, "-") + "-ios");
    setGithubRepoUrl(null);
    setGithubOpen(true);
  };

  const handleGithubPush = async () => {
    if (!githubToken || !githubRepoName) return;
    setGithubPushing(true);
    try {
      const res = await fetch(`${BASE}/api/apps/${appId}/wrap/push-github`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ token: githubToken, repoName: githubRepoName, isPrivate: githubPrivate }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Push failed");
      setGithubRepoUrl(data.repoUrl);
      toast({ title: "Repo created!", description: `${data.repoFullName} is ready on GitHub.` });
    } catch (err: any) {
      toast({ title: "GitHub push failed", description: err.message, variant: "destructive" });
    } finally {
      setGithubPushing(false);
    }
  };

  const handleGithubSync = async () => {
    if (!syncToken || !syncRepoFullName) return;
    setSyncPushing(true);
    setSyncDone(false);
    try {
      const res = await fetch(`${BASE}/api/apps/${appId}/wrap/sync-github`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ token: syncToken, repoFullName: syncRepoFullName }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Sync failed");
      setSyncDone(true);
      toast({ title: "GitHub synced!", description: `${data.synced.length} files updated in ${syncRepoFullName}.` });
    } catch (err: any) {
      toast({ title: "Sync failed", description: err.message, variant: "destructive" });
    } finally {
      setSyncPushing(false);
    }
  };

  const copyFile = async (file: GeneratedFile) => {
    await navigator.clipboard.writeText(file.content);
    setCopiedFile(file.name);
    setTimeout(() => setCopiedFile(null), 2000);
  };

  const downloadFile = (file: GeneratedFile) => {
    const blob = new Blob([file.content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = file.name.replace(" (additions)", "");
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleMarkBuilt = async () => {
    setCompletingItems(true);
    try {
      const res = await fetch(`${BASE}/api/apps/${appId}/wrap/complete`, {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      toast({
        title: "Checklist updated",
        description: `${data.completed.length} item${data.completed.length !== 1 ? "s" : ""} marked complete.`,
      });
      onChecklistRefresh?.();
    } catch {
      toast({ title: "Failed to update checklist", variant: "destructive" });
    } finally {
      setCompletingItems(false);
    }
  };

  return (
    <div className="space-y-6 pb-10">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">Native iOS Wrapper</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Turn your web app into a real iOS binary — no Mac required with Codemagic cloud builds.
          </p>
        </div>
        <a
          href="https://codemagic.io"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 text-xs font-mono text-muted-foreground hover:text-foreground transition-colors shrink-0"
        >
          <ExternalLink className="h-3 w-3" />
          Codemagic
        </a>
      </div>

      {/* Step indicators */}
      <div className="flex items-center gap-0">
        {STEPS.map((s, i) => {
          const Icon = s.icon;
          const isActive = step === s.id;
          const isDone = STEPS.findIndex(x => x.id === step) > i;
          return (
            <div key={s.id} className="flex items-center">
              <button
                onClick={() => {
                  if (isDone || isActive) setStep(s.id as typeof step);
                }}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-mono font-semibold uppercase tracking-wider transition-all ${
                  isActive
                    ? "bg-primary/10 text-primary border border-primary/20"
                    : isDone
                      ? "text-green-400 hover:bg-green-500/5 cursor-pointer"
                      : "text-muted-foreground/40 cursor-default"
                }`}
              >
                {isDone ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Icon className="h-3.5 w-3.5" />}
                <span className="hidden sm:inline">{s.label}</span>
              </button>
              {i < STEPS.length - 1 && (
                <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/20 mx-1" />
              )}
            </div>
          );
        })}
      </div>

      {/* Step 1: Configure */}
      {step === "configure" && (
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-sm font-mono uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <Smartphone className="h-4 w-4" />
              App Configuration
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-mono text-muted-foreground uppercase">Web URL</Label>
                <div className="relative">
                  <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/50" />
                  <Input
                    value={config.webUrl}
                    onChange={e => setConfig(c => ({ ...c, webUrl: e.target.value }))}
                    placeholder="https://your-app.replit.app"
                    className="pl-9 font-mono text-sm"
                  />
                </div>
                <p className="text-[11px] text-muted-foreground/60">The live URL your app is deployed at</p>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-mono text-muted-foreground uppercase">Bundle ID</Label>
                <Input
                  value={config.bundleId}
                  onChange={e => setConfig(c => ({ ...c, bundleId: e.target.value }))}
                  placeholder="com.yourcompany.appname"
                  className="font-mono text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-mono text-muted-foreground uppercase">App Name</Label>
                <Input
                  value={config.appName}
                  onChange={e => setConfig(c => ({ ...c, appName: e.target.value }))}
                  placeholder="My App"
                  className="font-mono text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-mono text-muted-foreground uppercase">Minimum iOS</Label>
                <Select value={config.minIosVersion} onValueChange={v => setConfig(c => ({ ...c, minIosVersion: v }))}>
                  <SelectTrigger className="font-mono text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {IOS_VERSIONS.map(v => (
                      <SelectItem key={v} value={v} className="font-mono">iOS {v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-mono text-muted-foreground uppercase">Background Color</Label>
                <div className="flex gap-2 items-center">
                  <input
                    type="color"
                    value={config.backgroundColor}
                    onChange={e => setConfig(c => ({ ...c, backgroundColor: e.target.value }))}
                    className="h-9 w-12 rounded-md border border-border cursor-pointer bg-transparent"
                  />
                  <Input
                    value={config.backgroundColor}
                    onChange={e => setConfig(c => ({ ...c, backgroundColor: e.target.value }))}
                    className="font-mono text-sm"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-mono text-muted-foreground uppercase">Status Bar Style</Label>
                <Select value={config.statusBarStyle} onValueChange={v => setConfig(c => ({ ...c, statusBarStyle: v }))}>
                  <SelectTrigger className="font-mono text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="lightContent" className="font-mono">Light (white text)</SelectItem>
                    <SelectItem value="darkContent" className="font-mono">Dark (black text)</SelectItem>
                    <SelectItem value="default" className="font-mono">Default</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Permissions */}
            <div className="space-y-2">
              <Label className="text-xs font-mono text-muted-foreground uppercase">Device Permissions</Label>
              <p className="text-[11px] text-muted-foreground/60">Only select permissions your app actually uses</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {PERMISSION_OPTIONS.map(p => (
                  <button
                    key={p.id}
                    onClick={() => togglePermission(p.id)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-mono transition-all ${
                      config.permissions.includes(p.id)
                        ? "bg-primary/10 border-primary/30 text-primary"
                        : "bg-muted/20 border-border/50 text-muted-foreground hover:border-border"
                    }`}
                  >
                    {config.permissions.includes(p.id)
                      ? <Check className="h-3 w-3 shrink-0" />
                      : <div className="h-3 w-3 rounded-sm border border-current/40 shrink-0" />
                    }
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Automation fields */}
            <div className="border-t border-border/50 pt-4 space-y-4">
              <p className="text-xs font-mono text-muted-foreground/60 uppercase tracking-wider">Automation</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-mono text-muted-foreground uppercase">Codemagic App ID</Label>
                  <Input
                    value={config.codemagicAppId}
                    onChange={e => setConfig(c => ({ ...c, codemagicAppId: e.target.value }))}
                    placeholder="69d8fe93edc544765927e7e6"
                    className="font-mono text-sm"
                  />
                  <p className="text-[11px] text-muted-foreground/60">From your Codemagic app URL</p>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-mono text-muted-foreground uppercase">GitHub Repo</Label>
                  <Input
                    value={config.githubRepoFullName}
                    onChange={e => setConfig(c => ({ ...c, githubRepoFullName: e.target.value }))}
                    placeholder="username/repo-name"
                    className="font-mono text-sm"
                  />
                  <p className="text-[11px] text-muted-foreground/60">e.g. tbiller3/wait-wise-ios</p>
                </div>
              </div>
            </div>

            <div className="pt-2">
              <Button onClick={handleSave} disabled={saving || !config.webUrl || !config.bundleId} className="w-full sm:w-auto">
                {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Package className="h-4 w-4 mr-2" />}
                {saving ? "Saving…" : "Save & Generate Files"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Generate */}
      {step === "generate" && (
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-sm font-mono uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <Package className="h-4 w-4" />
              Generate Project Files
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-xl border border-border/50 bg-muted/10 p-4 space-y-3">
              <p className="text-sm font-medium">Ready to generate your Capacitor project</p>
              <p className="text-sm text-muted-foreground">
                This will create all the files needed to wrap <span className="font-mono text-foreground">{config.webUrl}</span> as a native iOS app with bundle ID <span className="font-mono text-foreground">{config.bundleId}</span>.
              </p>
              <div className="grid grid-cols-2 gap-2 pt-1">
                {["capacitor.config.ts", "package.json", "codemagic.yaml", "Info.plist (additions)", "README.md"].map(f => (
                  <div key={f} className="flex items-center gap-1.5 text-xs font-mono text-muted-foreground">
                    <FileCode className="h-3 w-3 shrink-0" />
                    {f}
                  </div>
                ))}
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep("configure")} className="text-xs">
                Back
              </Button>
              <Button onClick={handleGenerate} disabled={generating}>
                {generating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Zap className="h-4 w-4 mr-2" />}
                {generating ? "Generating…" : "Generate Files"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Build — show generated files + build instructions */}
      {step === "build" && generatedFiles.length > 0 && (
        <div className="space-y-4">

          {/* ── AUTO BUILD PANEL ── */}
          <Card className="bg-gradient-to-br from-violet-950/40 to-card border border-violet-500/20">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Zap className="h-4 w-4 text-violet-400" />
                One-Tap Build & Launch
                <span className="ml-auto text-[10px] font-mono font-bold text-violet-400 bg-violet-500/10 border border-violet-500/20 px-2 py-0.5 rounded-full">AUTOMATED</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {!autoBuildStatus || autoBuildStatus.status === "queued" ? (
                <>
                  <p className="text-xs text-muted-foreground">
                    POSTAPP will sync files to GitHub, trigger a Codemagic build, and show live progress — all in one click.
                    Requires credentials in{" "}
                    <a href="/settings" className="text-violet-400 hover:underline">Settings</a>.
                  </p>
                  {(!config.codemagicAppId || !config.githubRepoFullName) && (
                    <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300">
                      <Zap className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                      Go back to Configure and fill in the Codemagic App ID and GitHub Repo fields to enable this.
                    </div>
                  )}
                  <Button
                    onClick={handleAutoBuild}
                    disabled={autoBuildLoading || !config.codemagicAppId || !config.githubRepoFullName}
                    className="w-full bg-violet-600 hover:bg-violet-500 text-white"
                  >
                    {autoBuildLoading
                      ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Triggering build…</>
                      : <><Zap className="h-4 w-4 mr-2" /> Build & Launch</>
                    }
                  </Button>
                </>
              ) : (
                <div className="space-y-3">
                  {/* Status badge */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {["finished"].includes(autoBuildStatus.status)
                        ? <CheckCircle2 className="h-4 w-4 text-green-500" />
                        : ["failed", "canceled"].includes(autoBuildStatus.status)
                          ? <div className="h-4 w-4 rounded-full bg-red-500/20 border border-red-500 flex items-center justify-center text-[8px] text-red-400">✕</div>
                          : <Loader2 className="h-4 w-4 animate-spin text-violet-400" />
                      }
                      <span className={`text-sm font-semibold capitalize ${
                        autoBuildStatus.status === "finished" ? "text-green-400"
                        : ["failed", "canceled"].includes(autoBuildStatus.status) ? "text-red-400"
                        : "text-violet-300"
                      }`}>
                        {autoBuildStatus.status === "finished" ? "Build Complete!" : autoBuildStatus.status}
                      </span>
                    </div>
                    <a
                      href={autoBuildStatus.codemagicUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[11px] text-muted-foreground hover:text-foreground flex items-center gap-1"
                    >
                      <ExternalLink className="h-3 w-3" />
                      View on Codemagic
                    </a>
                  </div>

                  {/* Build steps */}
                  {autoBuildStatus.steps.length > 0 && (
                    <div className="space-y-1">
                      {autoBuildStatus.steps.map((s, i) => (
                        <div key={i} className="flex items-center gap-2 text-xs font-mono">
                          {s.status === "finished" || s.status === "success"
                            ? <CheckCircle2 className="h-3 w-3 text-green-400 shrink-0" />
                            : s.status === "failed"
                              ? <div className="h-3 w-3 rounded-full bg-red-500 shrink-0" />
                              : s.status === "building" || s.status === "running"
                                ? <Loader2 className="h-3 w-3 animate-spin text-violet-400 shrink-0" />
                                : <div className="h-3 w-3 rounded-full border border-muted-foreground/30 shrink-0" />
                          }
                          <span className={
                            s.status === "finished" || s.status === "success" ? "text-muted-foreground"
                            : s.status === "failed" ? "text-red-400"
                            : s.status === "building" || s.status === "running" ? "text-foreground"
                            : "text-muted-foreground/40"
                          }>{s.name}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {autoBuildStatus.ipaUrl && (
                    <a
                      href={autoBuildStatus.ipaUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-2 w-full py-2 rounded-lg bg-green-600 hover:bg-green-500 text-white text-xs font-semibold"
                    >
                      <Download className="h-3.5 w-3.5" />
                      Download IPA
                    </a>
                  )}

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 text-xs"
                      onClick={() => { setAutoBuildStatus(null); handleAutoBuild(); }}
                      disabled={autoBuildLoading || ["queued", "preparing", "building", "finishing"].includes(autoBuildStatus.status)}
                    >
                      <Zap className="h-3.5 w-3.5 mr-1.5" />
                      Rebuild
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs"
                      onClick={pollBuildStatus}
                    >
                      Refresh
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Generated files */}
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-sm font-mono uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <FileCode className="h-4 w-4" />
                Generated Files
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {generatedFiles.map(file => (
                <div key={file.name} className="border border-border/50 rounded-lg overflow-hidden">
                  <div className="flex items-center justify-between px-3 py-2 bg-muted/20">
                    <button
                      onClick={() => setExpandedFile(expandedFile === file.name ? null : file.name)}
                      className="flex items-center gap-2 text-xs font-mono font-semibold text-foreground flex-1 text-left"
                    >
                      {expandedFile === file.name
                        ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                        : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                      }
                      {file.name}
                    </button>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => copyFile(file)}
                        className="flex items-center gap-1 px-2 py-1 rounded text-[11px] font-mono text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
                      >
                        {copiedFile === file.name ? <Check className="h-3 w-3 text-green-400" /> : <Copy className="h-3 w-3" />}
                        {copiedFile === file.name ? "Copied" : "Copy"}
                      </button>
                      <button
                        onClick={() => downloadFile(file)}
                        className="flex items-center gap-1 px-2 py-1 rounded text-[11px] font-mono text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
                      >
                        <Download className="h-3 w-3" />
                        Save
                      </button>
                    </div>
                  </div>
                  {expandedFile === file.name && (
                    <pre className="px-4 py-3 text-[11px] font-mono text-muted-foreground overflow-x-auto bg-muted/5 max-h-64 overflow-y-auto leading-relaxed">
                      {file.content}
                    </pre>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Build options */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Option A: Codemagic */}
            <Card className="bg-card border-border relative overflow-hidden">
              <div className="absolute top-3 right-3 text-[10px] font-mono font-bold text-green-400 bg-green-500/10 border border-green-500/20 px-2 py-0.5 rounded-full">
                RECOMMENDED
              </div>
              <CardHeader>
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Cloud className="h-4 w-4 text-blue-400" />
                  Cloud Build via Codemagic
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-xs text-muted-foreground">Build in the cloud without a Mac. Free tier includes 500 minutes/month.</p>
                <ol className="space-y-2">
                  {[
                    "Push files to GitHub (use the button below)",
                    "Sign up free at codemagic.io",
                    "Connect your repo — it auto-detects codemagic.yaml",
                    "Add your Apple signing certificates in the dashboard",
                    "Trigger a build → IPA goes to TestFlight",
                  ].map((s, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                      <span className={`font-mono shrink-0 mt-0.5 ${i === 0 ? "text-primary/70" : "text-muted-foreground/50"}`}>{i + 1}.</span>
                      {s}
                    </li>
                  ))}
                </ol>

                {/* GitHub push CTA */}
                {githubRepoUrl ? (
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                    <CheckCircle2 className="h-4 w-4 text-green-400 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-mono text-green-400 font-semibold">Repo created!</p>
                      <a
                        href={githubRepoUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[11px] text-blue-400 hover:underline truncate block"
                      >
                        {githubRepoUrl}
                      </a>
                    </div>
                  </div>
                ) : (
                  <Button
                    onClick={openGithubDialog}
                    className="w-full bg-gray-900 hover:bg-gray-800 border border-gray-700 text-white"
                  >
                    <Github className="h-4 w-4 mr-2" />
                    Push to GitHub
                  </Button>
                )}

                {/* Sync to existing repo */}
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full border-amber-500/40 text-amber-400 hover:bg-amber-500/10"
                  onClick={() => { setSyncDone(false); setSyncOpen(true); }}
                >
                  <Github className="h-3.5 w-3.5 mr-2" />
                  Sync files to existing repo
                </Button>

                {githubRepoUrl && (
                  <a
                    href="https://codemagic.io/start"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-1.5 w-full py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold transition-colors"
                  >
                    <Rocket className="h-3.5 w-3.5" />
                    Connect to Codemagic →
                  </a>
                )}
              </CardContent>
            </Card>

            {/* Option B: Local Mac */}
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Smartphone className="h-4 w-4 text-muted-foreground" />
                  Build Locally (Mac + Xcode)
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-xs text-muted-foreground">If you have access to a Mac with Xcode installed.</p>
                <ol className="space-y-2">
                  {[
                    "Copy the generated files to a folder on your Mac",
                    "Run: npm install",
                    "Run: npm run cap:ios",
                    "Run: npm run cap:open (opens Xcode)",
                    "In Xcode: set Team, archive, and submit",
                  ].map((step, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                      <span className="font-mono text-muted-foreground/50 shrink-0 mt-0.5">{i + 1}.</span>
                      {step}
                    </li>
                  ))}
                </ol>
              </CardContent>
            </Card>
          </div>

          {/* Mark as built */}
          <Card className="bg-card border border-green-500/20">
            <CardContent className="py-4 flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium">Binary uploaded to App Store Connect?</p>
                <p className="text-xs text-muted-foreground mt-0.5">Mark your wrap-related checklist items complete once you have a build in TestFlight.</p>
              </div>
              <Button
                onClick={handleMarkBuilt}
                disabled={completingItems}
                className="bg-green-600 hover:bg-green-500 text-white shrink-0"
              >
                {completingItems ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
                Mark Built
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {/* GitHub Push Dialog */}
      <Dialog open={githubOpen} onOpenChange={setGithubOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Github className="h-4 w-4" />
              Push to GitHub
            </DialogTitle>
            <DialogDescription>
              POSTAPP will create a private repo and push all 4 files automatically.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-1">
            {/* PAT */}
            <div className="space-y-1.5">
              <Label className="text-xs font-mono text-muted-foreground uppercase">
                GitHub Personal Access Token
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/50" />
                <Input
                  type={showToken ? "text" : "password"}
                  value={githubToken}
                  onChange={e => setGithubToken(e.target.value)}
                  placeholder="ghp_xxxxxxxxxxxx"
                  className="pl-9 pr-9 font-mono text-sm"
                />
                <button
                  onClick={() => setShowToken(s => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/50 hover:text-foreground transition-colors"
                >
                  {showToken ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                </button>
              </div>
              <p className="text-[11px] text-muted-foreground/60">
                Need one?{" "}
                <a
                  href="https://github.com/settings/tokens/new?scopes=repo&description=POSTAPP"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-400 hover:underline"
                >
                  Create a token with repo scope ↗
                </a>
              </p>
            </div>

            {/* Repo name */}
            <div className="space-y-1.5">
              <Label className="text-xs font-mono text-muted-foreground uppercase">Repo Name</Label>
              <Input
                value={githubRepoName}
                onChange={e => setGithubRepoName(e.target.value.replace(/\s+/g, "-").toLowerCase())}
                placeholder="wait-wise-ios"
                className="font-mono text-sm"
              />
            </div>

            {/* Private toggle */}
            <button
              onClick={() => setGithubPrivate(p => !p)}
              className={`flex items-center gap-2 w-full px-3 py-2 rounded-lg border text-xs font-mono transition-all ${
                githubPrivate
                  ? "bg-primary/10 border-primary/30 text-primary"
                  : "bg-muted/20 border-border/50 text-muted-foreground"
              }`}
            >
              <Lock className={`h-3.5 w-3.5 shrink-0 ${githubPrivate ? "" : "opacity-40"}`} />
              {githubPrivate ? "Private repo (recommended)" : "Public repo"}
            </button>

            <Button
              onClick={handleGithubPush}
              disabled={githubPushing || !githubToken || !githubRepoName}
              className="w-full"
            >
              {githubPushing
                ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Creating repo…</>
                : <><Github className="h-4 w-4 mr-2" /> Create & Push</>
              }
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Sync to Existing Repo Dialog */}
      <Dialog open={syncOpen} onOpenChange={setSyncOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Github className="h-4 w-4" />
              Sync to Existing Repo
            </DialogTitle>
            <DialogDescription>
              Updates all files in your existing GitHub repo with the latest build config — no manual editing needed.
            </DialogDescription>
          </DialogHeader>

          {syncDone ? (
            <div className="flex flex-col items-center gap-3 py-6">
              <CheckCircle2 className="h-10 w-10 text-green-500" />
              <p className="text-sm font-medium">Files synced to GitHub!</p>
              <p className="text-xs text-muted-foreground text-center">
                Go to Codemagic and start a new build — the updated files are live in your repo.
              </p>
              <a
                href="https://codemagic.io"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold transition-colors"
              >
                <Rocket className="h-3.5 w-3.5" />
                Open Codemagic →
              </a>
            </div>
          ) : (
            <div className="space-y-4 pt-1">
              <div className="space-y-1.5">
                <Label className="text-xs font-mono text-muted-foreground uppercase">
                  GitHub Personal Access Token
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/50" />
                  <Input
                    type={syncShowToken ? "text" : "password"}
                    value={syncToken}
                    onChange={e => setSyncToken(e.target.value)}
                    placeholder="ghp_xxxxxxxxxxxx"
                    className="pl-9 pr-9 font-mono text-sm"
                  />
                  <button
                    onClick={() => setSyncShowToken(s => !s)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/50 hover:text-foreground transition-colors"
                  >
                    {syncShowToken ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  </button>
                </div>
                <p className="text-[11px] text-muted-foreground/60">
                  Need one?{" "}
                  <a
                    href="https://github.com/settings/tokens/new?scopes=repo&description=POSTAPP"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400 hover:underline"
                  >
                    Create a token with repo scope ↗
                  </a>
                </p>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-mono text-muted-foreground uppercase">
                  Repo (owner/name)
                </Label>
                <Input
                  value={syncRepoFullName}
                  onChange={e => setSyncRepoFullName(e.target.value)}
                  placeholder="tbiller3/wait-wise-ios"
                  className="font-mono text-sm"
                />
                <p className="text-[11px] text-muted-foreground/60">
                  Format: your-username/repo-name
                </p>
              </div>

              <Button
                onClick={handleGithubSync}
                disabled={syncPushing || !syncToken || !syncRepoFullName}
                className="w-full bg-amber-600 hover:bg-amber-500 text-white"
              >
                {syncPushing
                  ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Syncing files…</>
                  : <><Github className="h-4 w-4 mr-2" /> Sync 4 files to GitHub</>
                }
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
