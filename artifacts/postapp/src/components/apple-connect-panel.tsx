import { useEffect, useMemo, useState } from "react";
import { useAppleConnectStore } from "@/state/apple-connect-store";
import { useSubmissionStore } from "@/state/submission-store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  CheckCircle2, XCircle, AlertTriangle, RefreshCw, ExternalLink, Link2,
  Layers, Clock, Download, Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { AppleVersion } from "@/types/apple";

// ---------------------------------------------------------------------------
// Connection status banner
// ---------------------------------------------------------------------------
function ConnectionBanner() {
  const { status, error, fetchApps } = useAppleConnectStore();

  if (status === "connected") {
    return (
      <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-green-500/10 border border-green-500/20 text-xs font-mono text-green-400">
        <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
        Connected to App Store Connect
        <button
          onClick={fetchApps}
          className="ml-auto inline-flex items-center gap-1 px-2 py-0.5 rounded-md hover:bg-green-500/10 transition-colors"
        >
          <RefreshCw className="h-3 w-3" />
          Refresh
        </button>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-xs font-mono text-red-400 space-y-1">
        <div className="flex items-center gap-2">
          <XCircle className="h-3.5 w-3.5 shrink-0" />
          <span className="font-semibold">Connection Error</span>
        </div>
        {error && <p className="ml-5 text-red-400/70 leading-relaxed">{error}</p>}
      </div>
    );
  }

  if (status === "unconfigured") {
    return (
      <div className="rounded-xl border border-border bg-muted/10 overflow-hidden">
        <div className="px-4 py-3 border-b border-border flex items-center gap-2">
          <Link2 className="h-3.5 w-3.5 text-primary" />
          <span className="font-mono text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Connect App Store Connect
          </span>
        </div>
        <div className="p-4 space-y-4">
          <p className="text-sm text-muted-foreground leading-relaxed">
            Provide your Apple API credentials to pull live app metadata, verify version strings,
            and enable three-way comparison of your local data vs. what Apple has on file.
          </p>
          <ol className="space-y-2 text-xs font-mono text-muted-foreground/70 list-decimal list-inside leading-relaxed">
            <li>Go to <a href="https://appstoreconnect.apple.com/access/integrations" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">App Store Connect → Users & Access → Integrations</a></li>
            <li>Create a new API key with <strong className="text-foreground/60">Developer</strong> role</li>
            <li>Download the .p8 private key file — you can only download it once</li>
            <li>Copy the <strong className="text-foreground/60">Issuer ID</strong> and <strong className="text-foreground/60">Key ID</strong> from the table</li>
          </ol>
          <div className="space-y-1.5 p-3 bg-background/40 rounded-lg border border-border/50">
            <p className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground/60">Required environment variables</p>
            {["APPLE_ISSUER_ID", "APPLE_KEY_ID", "APPLE_PRIVATE_KEY"].map((v) => (
              <p key={v} className="text-[11px] font-mono text-blue-400/70">
                <span className="text-muted-foreground/40">$</span> {v}
              </p>
            ))}
            <p className="text-[10px] text-muted-foreground/40 mt-1.5 leading-relaxed">
              Or use APPLE_PRIVATE_KEY_BASE64 with the key base64-encoded (useful for secrets with newlines).
            </p>
          </div>
          <a
            href="https://developer.apple.com/documentation/appstoreconnectapi/generating_tokens_for_api_requests"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-[11px] font-mono text-primary/70 hover:text-primary transition-colors"
          >
            <ExternalLink className="h-3 w-3" />
            Apple Auth Docs
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-muted/10 border border-border/40 text-xs font-mono text-muted-foreground">
      <RefreshCw className="h-3.5 w-3.5 animate-spin" />
      Connecting to App Store Connect…
    </div>
  );
}

// ---------------------------------------------------------------------------
// Version state chip
// ---------------------------------------------------------------------------
const STATE_STYLES: Record<string, string> = {
  READY_FOR_SALE: "bg-green-500/10 text-green-400 border-green-500/20",
  DEVELOPER_REMOVED_FROM_SALE: "bg-muted/30 text-muted-foreground border-border/40",
  PREPARE_FOR_SUBMISSION: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  WAITING_FOR_REVIEW: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  IN_REVIEW: "bg-violet-500/10 text-violet-400 border-violet-500/20",
  REJECTED: "bg-red-500/10 text-red-400 border-red-500/20",
  METADATA_REJECTED: "bg-red-500/10 text-red-400 border-red-500/20",
};

function VersionRow({ v }: { v: AppleVersion }) {
  const a = v.attributes;
  const stateStyle = STATE_STYLES[a.appStoreState] ?? "bg-muted/20 text-muted-foreground border-border/30";
  const date = a.createdDate ? new Date(a.createdDate).toLocaleDateString() : "—";
  return (
    <div className="flex items-center gap-3 py-2.5 px-4 text-sm">
      <span className="font-mono font-bold text-foreground w-16 shrink-0">{a.versionString}</span>
      <span className={cn("px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold uppercase tracking-wider border", stateStyle)}>
        {a.appStoreState.replace(/_/g, " ")}
      </span>
      <span className="text-[11px] font-mono text-muted-foreground/50 ml-auto shrink-0">{date}</span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Three-way comparison table
// ---------------------------------------------------------------------------
type CompareField = { label: string; local: string; detected: string; apple: string; long?: boolean };

function ThreeWayRow({ label, local, detected, apple, long }: CompareField) {
  const [expanded, setExpanded] = useState(false);
  const localMatchesApple = !!(local && apple && local.trim() === apple.trim());
  const mismatch = !!(local && apple && !localMatchesApple);

  const display = (val: string) => {
    if (!val) return <span className="text-muted-foreground/30 italic">—</span>;
    if (long && !expanded && val.length > 60) {
      return (
        <button onClick={() => setExpanded(true)} className="text-left text-blue-400/70 hover:text-blue-400 transition-colors">
          {val.slice(0, 60)}<span className="opacity-50">… show more</span>
        </button>
      );
    }
    return <span className={expanded ? "whitespace-pre-wrap" : "truncate"}>{val}</span>;
  };

  return (
    <div className={cn(
      "grid grid-cols-4 gap-2 py-2.5 px-4 text-xs font-mono border-b border-border/30 last:border-0",
      long && expanded && "items-start",
    )}>
      <span className="text-muted-foreground/60 font-semibold uppercase tracking-wider pt-0.5">{label}</span>
      <span className={cn(long ? "" : "truncate")}>{display(local)}</span>
      <span className={cn(long ? "" : "truncate")}>{display(detected)}</span>
      <div className={cn("flex gap-1.5", long ? "items-start" : "items-center")}>
        <span className={cn(long ? "" : "truncate")}>{display(apple)}</span>
        {localMatchesApple && <CheckCircle2 className="h-3 w-3 text-green-400 shrink-0 mt-0.5" />}
        {mismatch && <AlertTriangle className="h-3 w-3 text-amber-400 shrink-0 mt-0.5" />}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main panel
// ---------------------------------------------------------------------------
export function AppleConnectPanel() {
  const {
    status, apps, selectedAppId, versions, builds, localizations,
    checkStatus, selectApp, syncToSubmission, isSyncing, autoMatchedAppId, tryAutoMatch,
  } = useAppleConnectStore();
  const { fields, detected } = useSubmissionStore();

  useEffect(() => {
    checkStatus();
  }, []);

  useEffect(() => {
    if (status === "connected" && apps.length > 0) {
      tryAutoMatch();
    }
  }, [status, apps.length, fields.bundleId]);

  const selectedApp = useMemo(() => apps.find((a) => a.id === selectedAppId) ?? null, [apps, selectedAppId]);

  const primaryLocale = selectedApp?.attributes.primaryLocale ?? "en-US";
  const localization = useMemo(
    () => localizations.find((l) => l.attributes.locale === primaryLocale) ?? localizations[0] ?? null,
    [localizations, primaryLocale],
  );

  const latestBuildNumber = builds[0]?.attributes.version ?? "";
  const appleVersion = versions[0]?.attributes.versionString ?? "";

  const compareFields: CompareField[] = useMemo(() => {
    if (!selectedApp) return [];
    const attr = selectedApp.attributes;
    const la = localization?.attributes;
    return [
      { label: "Name",        local: fields.appName,       detected: detected.appName ?? "",       apple: la?.name ?? attr.name },
      { label: "Subtitle",    local: fields.subtitle ?? "", detected: detected.subtitle ?? "",       apple: la?.subtitle ?? "" },
      { label: "Bundle ID",   local: fields.bundleId,      detected: detected.bundleId ?? "",       apple: attr.bundleId },
      { label: "Version",     local: fields.version,       detected: detected.version ?? "",        apple: appleVersion },
      { label: "Build #",     local: fields.buildNumber ?? "", detected: detected.buildNumber ?? "", apple: latestBuildNumber },
      { label: "Category",    local: fields.category ?? "", detected: detected.category ?? "",      apple: "" },
      { label: "Age Rating",  local: fields.ageRating ?? "", detected: detected.ageRating ?? "",    apple: "" },
      { label: "Keywords",    local: fields.keywords ?? "", detected: detected.keywords ?? "",       apple: la?.keywords ?? "", long: true },
      { label: "Description", local: fields.description,   detected: detected.description ?? "",    apple: la?.description ?? "", long: true },
      { label: "Support URL", local: fields.supportUrl ?? "", detected: detected.supportUrl ?? "", apple: la?.supportUrl ?? "" },
      { label: "Privacy URL", local: fields.privacyPolicyUrl ?? "", detected: detected.privacyPolicyUrl ?? "", apple: la?.privacyPolicyUrl ?? "" },
    ];
  }, [selectedApp, fields, detected, localization, appleVersion, latestBuildNumber]);

  const syncableCount = useMemo(() => {
    if (!selectedApp) return 0;
    const attr = selectedApp.attributes;
    const la = localization?.attributes;
    return [
      attr.bundleId,
      attr.name,
      latestBuildNumber,
      la?.subtitle,
      la?.description,
      la?.keywords,
      la?.supportUrl,
      la?.privacyPolicyUrl,
    ].filter(Boolean).length;
  }, [selectedApp, localization, latestBuildNumber]);

  return (
    <div className="space-y-5">
      <ConnectionBanner />

      {status === "connected" && (
        <>
          {/* App selector */}
          <Card className="bg-card border-border">
            <CardHeader className="py-3 px-4 border-b border-border/60">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xs font-mono uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                  <Link2 className="h-3.5 w-3.5" />
                  Select Apple App
                </CardTitle>
                {autoMatchedAppId && (
                  <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-green-500/10 border border-green-500/20 text-[10px] font-mono text-green-400">
                    <Zap className="h-3 w-3" />
                    Auto-matched by Bundle ID
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent className="p-4">
              {apps.length === 0 ? (
                <p className="text-sm text-muted-foreground/60 italic">No apps found in your account.</p>
              ) : (
                <Select value={selectedAppId ?? ""} onValueChange={selectApp}>
                  <SelectTrigger className="font-mono text-sm bg-background/50">
                    <SelectValue placeholder="Choose an app…" />
                  </SelectTrigger>
                  <SelectContent>
                    {apps.map((a) => (
                      <SelectItem key={a.id} value={a.id} className="font-mono text-sm">
                        <span className="font-semibold">{a.attributes.name}</span>
                        <span className="ml-2 text-muted-foreground/60">{a.attributes.bundleId}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </CardContent>
          </Card>

          {/* Three-way comparison */}
          {selectedApp && (
            <Card className="bg-card border-border overflow-hidden">
              <CardHeader className="py-3 px-4 border-b border-border/60">
                <div className="flex items-center justify-between gap-3">
                  <CardTitle className="text-xs font-mono uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                    <Layers className="h-3.5 w-3.5" />
                    Three-Way Verification
                  </CardTitle>
                  <button
                    onClick={syncToSubmission}
                    disabled={isSyncing}
                    className={cn(
                      "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-mono font-semibold uppercase tracking-wider border transition-all shrink-0",
                      isSyncing
                        ? "bg-green-500/15 border-green-500/30 text-green-400"
                        : "bg-blue-500/10 border-blue-500/20 text-blue-400 hover:bg-blue-500/20"
                    )}
                  >
                    {isSyncing ? (
                      <><CheckCircle2 className="h-3 w-3" />All Fields Synced!</>
                    ) : (
                      <><Download className="h-3 w-3" />Sync All from Apple ({syncableCount} fields)</>
                    )}
                  </button>
                </div>
              </CardHeader>
              <div className="grid grid-cols-4 gap-2 py-2 px-4 border-b border-border/60 bg-muted/10">
                <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground/40">Field</span>
                <span className="text-[10px] font-mono uppercase tracking-wider text-primary/50">POSTAPP Local</span>
                <span className="text-[10px] font-mono uppercase tracking-wider text-blue-400/50">Detected Build</span>
                <span className="text-[10px] font-mono uppercase tracking-wider text-green-400/50">App Store Connect</span>
              </div>
              <div className="divide-y divide-border/20">
                {compareFields.map((f) => <ThreeWayRow key={f.label} {...f} />)}
              </div>
              {localizations.length === 0 && (
                <div className="px-4 py-3 border-t border-border/40 bg-muted/5 text-[11px] font-mono text-muted-foreground/50 flex items-center gap-2">
                  <RefreshCw className="h-3 w-3 animate-spin" />
                  Fetching localizations from App Store Connect…
                </div>
              )}
            </Card>
          )}

          {/* Version history */}
          {selectedApp && (
            <Card className="bg-card border-border overflow-hidden">
              <CardHeader className="py-3 px-4 border-b border-border/60">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xs font-mono uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                    <Clock className="h-3.5 w-3.5" />
                    App Store Versions
                  </CardTitle>
                  <span className="text-[10px] font-mono text-muted-foreground/40">{selectedApp.attributes.name}</span>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {versions.length === 0 ? (
                  <p className="text-sm text-muted-foreground/60 italic p-4">No versions found.</p>
                ) : (
                  <div className="divide-y divide-border/30">
                    {versions.map((v) => <VersionRow key={v.id} v={v} />)}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
