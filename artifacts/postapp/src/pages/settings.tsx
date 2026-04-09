import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Save, Eye, EyeOff, Key, Github, Zap, CheckCircle2, ExternalLink } from "lucide-react";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

export default function Settings() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
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

  useEffect(() => {
    fetch(`${BASE}/api/settings`, { credentials: "include" })
      .then(r => r.json())
      .then(data => {
        if (data.exists) {
          setStatus(data);
          setFields(f => ({
            ...f,
            appStoreKeyId: data.appStoreKeyId || "",
            appStoreIssuerId: data.appStoreIssuerId || "",
          }));
        }
      })
      .finally(() => setLoading(false));
  }, []);

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

      // Refresh status
      const updated = await fetch(`${BASE}/api/settings`, { credentials: "include" }).then(r => r.json());
      setStatus(updated);
      setFields(f => ({ ...f, codemagicApiKey: "", githubToken: "", appStorePrivateKey: "" }));
      toast({ title: "Settings saved", description: "Your credentials are stored securely." });
    } catch {
      toast({ title: "Save failed", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center py-24 text-muted-foreground text-sm">Loading settings…</div>;
  }

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Build Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Store your credentials once — POSTAPP uses them for all automated builds.
        </p>
      </div>

      {/* Status summary */}
      <Card className="bg-card border-border">
        <CardContent className="pt-4 pb-3">
          <div className="grid grid-cols-3 gap-3 text-center">
            {[
              { label: "Codemagic", ok: status.hasCodemagicApiKey },
              { label: "GitHub", ok: status.hasGithubToken },
              { label: "App Store", ok: status.hasAppStoreKey },
            ].map(({ label, ok }) => (
              <div key={label} className="space-y-1">
                <div className={`h-2 w-2 rounded-full mx-auto ${ok ? "bg-green-500" : "bg-muted-foreground/30"}`} />
                <p className="text-[11px] font-mono text-muted-foreground">{label}</p>
                <p className="text-[10px] text-muted-foreground/60">{ok ? "✓ Saved" : "Not set"}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Codemagic */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Zap className="h-4 w-4 text-amber-400" />
            Codemagic API Key
            {status.hasCodemagicApiKey && <CheckCircle2 className="h-3.5 w-3.5 text-green-500 ml-auto" />}
          </CardTitle>
          <CardDescription className="text-xs">
            Used to trigger iOS builds automatically.{" "}
            <a
              href="https://codemagic.io/teams"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-400 hover:underline inline-flex items-center gap-0.5"
            >
              Get it here <ExternalLink className="h-3 w-3" />
            </a>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <Key className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/50" />
            <Input
              type={showCM ? "text" : "password"}
              value={fields.codemagicApiKey}
              onChange={e => setFields(f => ({ ...f, codemagicApiKey: e.target.value }))}
              placeholder={status.hasCodemagicApiKey ? "••••••••••••••••••••••••" : "Paste your Codemagic API key"}
              className="pl-9 pr-9 font-mono text-sm"
            />
            <button
              onClick={() => setShowCM(s => !s)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/50 hover:text-foreground"
            >
              {showCM ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
            </button>
          </div>
          <p className="text-[11px] text-muted-foreground/60 mt-2">
            Found in Codemagic → Teams → your team → Integrations → Codemagic API
          </p>
        </CardContent>
      </Card>

      {/* GitHub */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Github className="h-4 w-4" />
            GitHub Personal Access Token
            {status.hasGithubToken && <CheckCircle2 className="h-3.5 w-3.5 text-green-500 ml-auto" />}
          </CardTitle>
          <CardDescription className="text-xs">
            Used to push project files to GitHub before each build.{" "}
            <a
              href="https://github.com/settings/tokens/new?scopes=repo&description=POSTAPP"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-400 hover:underline inline-flex items-center gap-0.5"
            >
              Create token (repo scope) <ExternalLink className="h-3 w-3" />
            </a>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <Key className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/50" />
            <Input
              type={showGH ? "text" : "password"}
              value={fields.githubToken}
              onChange={e => setFields(f => ({ ...f, githubToken: e.target.value }))}
              placeholder={status.hasGithubToken ? "••••••••••••••••••••••••" : "ghp_xxxxxxxxxxxxxxxxxxxx"}
              className="pl-9 pr-9 font-mono text-sm"
            />
            <button
              onClick={() => setShowGH(s => !s)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/50 hover:text-foreground"
            >
              {showGH ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
            </button>
          </div>
        </CardContent>
      </Card>

      {/* App Store Connect */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Key className="h-4 w-4 text-blue-400" />
            App Store Connect API Key
            {status.hasAppStoreKey && <CheckCircle2 className="h-3.5 w-3.5 text-green-500 ml-auto" />}
          </CardTitle>
          <CardDescription className="text-xs">
            For automatic code signing and TestFlight uploads.{" "}
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
            <Label className="text-xs font-mono text-muted-foreground/70 uppercase">Private Key (.p8 contents)</Label>
            <div className="relative">
              <textarea
                value={fields.appStorePrivateKey}
                onChange={e => setFields(f => ({ ...f, appStorePrivateKey: e.target.value }))}
                placeholder={status.hasAppStoreKey ? "••••••••••••" : "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----"}
                className={`w-full min-h-[80px] px-3 py-2 rounded-md border border-input bg-background text-sm font-mono resize-none focus:outline-none focus:ring-2 focus:ring-ring ${!showAS ? "text-transparent select-none placeholder:text-muted-foreground" : ""}`}
                style={!showAS && fields.appStorePrivateKey ? { color: "transparent", textShadow: "0 0 8px rgba(255,255,255,0.5)" } : {}}
              />
              <button
                onClick={() => setShowAS(s => !s)}
                className="absolute right-3 top-3 text-muted-foreground/50 hover:text-foreground"
              >
                {showAS ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
              </button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Button onClick={save} disabled={saving} className="w-full">
        <Save className="h-4 w-4 mr-2" />
        {saving ? "Saving…" : "Save credentials"}
      </Button>

      <p className="text-center text-[11px] text-muted-foreground/50">
        Credentials are stored in your private POSTAPP database.
      </p>
    </div>
  );
}
