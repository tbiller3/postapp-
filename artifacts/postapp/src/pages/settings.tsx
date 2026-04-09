import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useBilling } from "@/hooks/use-billing";
import { useLocation } from "wouter";
import {
  Save, Eye, EyeOff, Key, Github, Zap, CheckCircle2,
  ExternalLink, AlertCircle, Loader2, RefreshCw, ShieldCheck,
  CreditCard, ArrowUpRight, Crown,
} from "lucide-react";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

type ValidationResult = { ok: boolean; message: string };
type ValidationMap = { codemagic: ValidationResult; github: ValidationResult; appStore: ValidationResult };

const STEPS = [
  {
    id: "codemagic",
    title: "Codemagic API Key",
    icon: Zap,
    color: "text-amber-400",
    description: "Lets POSTAPP trigger cloud iOS builds on your behalf.",
    hint: "Codemagic → Teams → your team → Integrations → Codemagic API → Show",
    placeholder: "Paste your Codemagic API key",
    link: { href: "https://codemagic.io/teams", label: "Open Codemagic" },
    field: "codemagicApiKey" as const,
    showField: "showCM" as const,
    statusKey: "hasCodemagicApiKey" as const,
  },
  {
    id: "github",
    title: "GitHub Personal Access Token",
    icon: Github,
    color: "text-white",
    description: "Pushes the generated Capacitor project files to your repo before each build.",
    hint: "github.com → Settings → Developer settings → Personal access tokens → Tokens (classic) → repo scope",
    placeholder: "ghp_xxxxxxxxxxxxxxxxxxxx",
    link: {
      href: "https://github.com/settings/tokens/new?scopes=repo&description=POSTAPP",
      label: "Create token (repo scope)",
    },
    field: "githubToken" as const,
    showField: "showGH" as const,
    statusKey: "hasGithubToken" as const,
  },
];

const PLAN_LABELS: Record<string, string> = {
  free: "Free",
  solo: "Solo",
  builder: "Builder",
  studio: "Studio",
};

const PLAN_COLORS: Record<string, string> = {
  free: "text-slate-400 bg-slate-500/10 border-slate-500/20",
  solo: "text-sky-400 bg-sky-500/10 border-sky-500/20",
  builder: "text-violet-400 bg-violet-500/10 border-violet-500/20",
  studio: "text-amber-400 bg-amber-500/10 border-amber-500/20",
};

export default function Settings() {
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const billing = useBilling();
  const [portalLoading, setPortalLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [validating, setValidating] = useState(false);
  const [showCM, setShowCM] = useState(false);
  const [showGH, setShowGH] = useState(false);
  const [showAS, setShowAS] = useState(false);

  const [status, setStatus] = useState({
    hasCodemagicApiKey: false,
    hasGithubToken: false,
    hasAppStoreKey: false,
    appStoreKeyId: "",
    appStoreIssuerId: "",
  });

  const [fields, setFields] = useState({
    codemagicApiKey: "",
    githubToken: "",
    appStoreKeyId: "",
    appStoreIssuerId: "",
    appStorePrivateKey: "",
  });

  const [validation, setValidation] = useState<ValidationMap | null>(null);

  const loadStatus = useCallback(async () => {
    const data = await fetch(`${BASE}/api/settings`, { credentials: "include" }).then(r => r.json());
    if (data.exists) {
      setStatus(data);
      setFields(f => ({
        ...f,
        appStoreKeyId: data.appStoreKeyId || "",
        appStoreIssuerId: data.appStoreIssuerId || "",
      }));
    }
  }, []);

  useEffect(() => {
    loadStatus().finally(() => setLoading(false));
  }, [loadStatus]);

  const save = async () => {
    setSaving(true);
    try {
      const body: Record<string, string> = {};
      if (fields.codemagicApiKey) body.codemagicApiKey = fields.codemagicApiKey;
      if (fields.githubToken) body.githubToken = fields.githubToken;
      if (fields.appStoreKeyId) body.appStoreKeyId = fields.appStoreKeyId;
      if (fields.appStoreIssuerId) body.appStoreIssuerId = fields.appStoreIssuerId;
      if (fields.appStorePrivateKey) body.appStorePrivateKey = fields.appStorePrivateKey;

      const res = await fetch(`${BASE}/api/settings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("Failed to save");

      await loadStatus();
      setFields(f => ({ ...f, codemagicApiKey: "", githubToken: "", appStorePrivateKey: "" }));
      toast({ title: "Credentials saved" });

      // Auto-validate after save
      validate();
    } catch {
      toast({ title: "Save failed", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const validate = async () => {
    setValidating(true);
    try {
      const res = await fetch(`${BASE}/api/settings/validate`, {
        method: "POST",
        credentials: "include",
      });
      const data = await res.json() as ValidationMap;
      setValidation(data);
    } catch {
      toast({ title: "Validation failed", variant: "destructive" });
    } finally {
      setValidating(false);
    }
  };

  const openPortal = async () => {
    setPortalLoading(true);
    try {
      const res = await fetch(`${BASE}/api/billing/portal`, { method: "POST", credentials: "include" });
      const data = await res.json();
      if (data.url) window.open(data.url, "_blank");
      else throw new Error(data.error || "Failed");
    } catch (err: any) {
      toast({ title: "Billing portal failed", description: err.message, variant: "destructive" });
    } finally {
      setPortalLoading(false);
    }
  };

  const readiness = [
    { label: "Codemagic API", ok: validation ? validation.codemagic.ok : status.hasCodemagicApiKey },
    { label: "GitHub Token", ok: validation ? validation.github.ok : status.hasGithubToken },
    { label: "App Store Connect", ok: validation ? validation.appStore.ok : status.hasAppStoreKey },
  ];
  const readyCount = readiness.filter(r => r.ok).length;
  const allReady = readyCount === readiness.length;

  const showMap = { showCM, showGH };
  const setShowMap = { showCM: setShowCM, showGH: setShowGH };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 text-muted-foreground text-sm">
        <Loader2 className="h-4 w-4 animate-spin mr-2" /> Loading settings…
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto space-y-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Pipeline Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Enter your credentials once — every build after that is fully automatic.
        </p>
      </div>

      {/* Billing Card */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <CreditCard className="h-4 w-4 text-violet-400" />
            Plan & Billing
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Crown className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Current Plan</span>
            </div>
            <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded-full border ${PLAN_COLORS[billing.plan]}`}>
              {PLAN_LABELS[billing.plan] ?? "Free"}
            </span>
          </div>

          {billing.subscription && (
            <div className="text-xs text-muted-foreground space-y-1">
              <div className="flex justify-between">
                <span>Status</span>
                <span className={billing.subscription.status === "active" ? "text-green-400" : "text-amber-400"}>
                  {billing.subscription.status}
                </span>
              </div>
              {billing.subscription.cancelAtPeriodEnd && (
                <p className="text-amber-400/80 text-[11px]">
                  Cancels at end of billing period
                </p>
              )}
            </div>
          )}

          {!billing.isPaid ? (
            <div className="flex gap-2">
              <Button
                size="sm"
                className="flex-1 bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold"
                onClick={() => navigate("/pricing")}
              >
                <Zap className="h-3.5 w-3.5 mr-1.5" />
                Upgrade Plan
              </Button>
            </div>
          ) : (
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                className="flex-1 text-xs"
                onClick={openPortal}
                disabled={portalLoading}
              >
                {portalLoading
                  ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                  : <ArrowUpRight className="h-3.5 w-3.5 mr-1.5" />
                }
                Manage Billing
              </Button>
              {billing.plan !== "studio" && (
                <Button
                  size="sm"
                  className="flex-1 bg-violet-600 hover:bg-violet-500 text-white text-xs"
                  onClick={() => navigate("/pricing")}
                >
                  Upgrade
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Readiness Summary */}
      <Card className={`border ${allReady ? "border-green-500/40 bg-green-950/20" : "border-amber-500/30 bg-amber-950/10"}`}>
        <CardContent className="pt-4 pb-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <ShieldCheck className={`h-4 w-4 ${allReady ? "text-green-400" : "text-amber-400"}`} />
              <span className="text-sm font-semibold">
                {allReady ? "Pipeline Ready — 100% Automated" : `${readyCount} of ${readiness.length} credentials verified`}
              </span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={validate}
              disabled={validating}
              className="h-7 text-xs gap-1"
            >
              {validating ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
              {validating ? "Validating…" : "Validate all"}
            </Button>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {readiness.map(({ label, ok }) => (
              <div key={label} className={`rounded-md px-2 py-2 text-center border ${ok ? "border-green-500/30 bg-green-950/30" : "border-border bg-muted/20"}`}>
                <div className={`h-1.5 w-1.5 rounded-full mx-auto mb-1 ${ok ? "bg-green-500" : "bg-muted-foreground/30"}`} />
                <p className="text-[10px] font-mono text-muted-foreground leading-tight">{label}</p>
                <p className={`text-[10px] mt-0.5 ${ok ? "text-green-400" : "text-muted-foreground/50"}`}>
                  {ok ? "✓ Verified" : "Not set"}
                </p>
              </div>
            ))}
          </div>
          {allReady && (
            <p className="text-[11px] text-green-400/80 text-center mt-3">
              All credentials verified. Use Build & Launch in any app to deploy automatically.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Codemagic + GitHub credential cards */}
      {STEPS.map(step => {
        const Icon = step.icon;
        const isSet = status[step.statusKey];
        const val = validation?.[step.id as keyof ValidationMap];

        return (
          <Card key={step.id} className="bg-card border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Icon className={`h-4 w-4 ${step.color}`} />
                {step.title}
                {val ? (
                  val.ok
                    ? <CheckCircle2 className="h-3.5 w-3.5 text-green-500 ml-auto" />
                    : <AlertCircle className="h-3.5 w-3.5 text-red-400 ml-auto" />
                ) : isSet ? (
                  <CheckCircle2 className="h-3.5 w-3.5 text-green-500/50 ml-auto" />
                ) : null}
              </CardTitle>
              <CardDescription className="text-xs">
                {step.description}{" "}
                <a
                  href={step.link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-400 hover:underline inline-flex items-center gap-0.5"
                >
                  {step.link.label} <ExternalLink className="h-3 w-3" />
                </a>
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="relative">
                <Key className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/50" />
                <Input
                  type={showMap[step.showField] ? "text" : "password"}
                  value={fields[step.field]}
                  onChange={e => setFields(f => ({ ...f, [step.field]: e.target.value }))}
                  placeholder={isSet ? "••••••••••••••••••••••••" : step.placeholder}
                  className="pl-9 pr-9 font-mono text-sm"
                />
                <button
                  onClick={() => setShowMap[step.showField](s => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/50 hover:text-foreground"
                >
                  {showMap[step.showField] ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                </button>
              </div>
              {val && (
                <p className={`text-[11px] flex items-center gap-1 ${val.ok ? "text-green-400" : "text-red-400"}`}>
                  {val.ok ? <CheckCircle2 className="h-3 w-3" /> : <AlertCircle className="h-3 w-3" />}
                  {val.message}
                </p>
              )}
              {!val && (
                <p className="text-[11px] text-muted-foreground/50">{step.hint}</p>
              )}
            </CardContent>
          </Card>
        );
      })}

      {/* App Store Connect */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Key className="h-4 w-4 text-blue-400" />
            App Store Connect API Key
            {validation?.appStore ? (
              validation.appStore.ok
                ? <CheckCircle2 className="h-3.5 w-3.5 text-green-500 ml-auto" />
                : <AlertCircle className="h-3.5 w-3.5 text-red-400 ml-auto" />
            ) : status.hasAppStoreKey ? (
              <CheckCircle2 className="h-3.5 w-3.5 text-green-500/50 ml-auto" />
            ) : null}
          </CardTitle>
          <CardDescription className="text-xs">
            Used for automatic code signing. POSTAPP injects these directly into each build — no Codemagic dashboard setup needed.{" "}
            <a
              href="https://appstoreconnect.apple.com/access/integrations/api"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-400 hover:underline inline-flex items-center gap-0.5"
            >
              Generate in App Store Connect <ExternalLink className="h-3 w-3" />
            </a>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1.5">
            <Label className="text-xs font-mono text-muted-foreground/70 uppercase">Key ID</Label>
            <Input
              value={fields.appStoreKeyId}
              onChange={e => setFields(f => ({ ...f, appStoreKeyId: e.target.value }))}
              placeholder="XXXXXXXXXX"
              className="font-mono text-sm"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-mono text-muted-foreground/70 uppercase">Issuer ID</Label>
            <Input
              value={fields.appStoreIssuerId}
              onChange={e => setFields(f => ({ ...f, appStoreIssuerId: e.target.value }))}
              placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
              className="font-mono text-sm"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-mono text-muted-foreground/70 uppercase">
              Private Key (.p8 file contents)
            </Label>
            <div className="relative">
              <textarea
                value={fields.appStorePrivateKey}
                onChange={e => setFields(f => ({ ...f, appStorePrivateKey: e.target.value }))}
                placeholder={
                  status.hasAppStoreKey
                    ? "••••••••••••"
                    : "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----"
                }
                rows={3}
                className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm font-mono resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                style={
                  !showAS && fields.appStorePrivateKey
                    ? { color: "transparent", textShadow: "0 0 8px rgba(255,255,255,0.4)" }
                    : {}
                }
              />
              <button
                onClick={() => setShowAS(s => !s)}
                className="absolute right-3 top-3 text-muted-foreground/50 hover:text-foreground"
              >
                {showAS ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
              </button>
            </div>
            <p className="text-[11px] text-muted-foreground/50">
              App Store Connect → Users & Access → Keys → + → App Manager role → Download .p8 → open in a text editor and paste all lines here
            </p>
          </div>
          {validation?.appStore && (
            <p className={`text-[11px] flex items-center gap-1 ${validation.appStore.ok ? "text-green-400" : "text-red-400"}`}>
              {validation.appStore.ok
                ? <CheckCircle2 className="h-3 w-3" />
                : <AlertCircle className="h-3 w-3" />}
              {validation.appStore.message}
            </p>
          )}
        </CardContent>
      </Card>

      <Button onClick={save} disabled={saving} className="w-full">
        {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
        {saving ? "Saving…" : "Save credentials"}
      </Button>

      <p className="text-center text-[11px] text-muted-foreground/50">
        Credentials are stored in your private POSTAPP database and never shared.
      </p>
    </div>
  );
}
