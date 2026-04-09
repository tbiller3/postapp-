import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { CheckCircle2, Clock, ImageIcon, Smartphone, Tablet, ChevronDown, ChevronUp, AppWindow } from "lucide-react";

type Screenshot = {
  id: number;
  appId: number;
  deviceType: string;
  label: string;
  requiredSize: string;
  status: string;
  notes: string | null;
};

const REQUIRED_DEVICE_TYPES = ["6.9-inch", "6.5-inch"];

function DeviceIcon({ deviceType }: { deviceType: string }) {
  if (deviceType.startsWith("ipad")) return <Tablet className="h-4 w-4" />;
  return <Smartphone className="h-4 w-4" />;
}

function ScreenshotSlot({
  item,
  onUpdate,
}: {
  item: Screenshot;
  onUpdate: (id: number, status: string, notes: string) => Promise<void>;
}) {
  const [expanded, setExpanded] = useState(false);
  const [notes, setNotes] = useState(item.notes ?? "");
  const [saving, setSaving] = useState(false);
  const isRequired = REQUIRED_DEVICE_TYPES.includes(item.deviceType);
  const isReady = item.status === "ready";

  async function toggle() {
    setSaving(true);
    await onUpdate(item.id, isReady ? "pending" : "ready", notes);
    setSaving(false);
  }

  async function saveNotes() {
    setSaving(true);
    await onUpdate(item.id, item.status, notes);
    setSaving(false);
    setExpanded(false);
  }

  return (
    <div className={`rounded-lg border transition-all ${isReady ? "border-green-500/30 bg-green-500/5" : isRequired ? "border-amber-500/20 bg-amber-500/3" : "border-border/50 bg-card/20"}`}>
      <div className="flex items-center gap-3 p-3">
        <button
          onClick={toggle}
          disabled={saving}
          className={`flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${isReady ? "border-green-500 bg-green-500" : "border-muted-foreground/40 hover:border-green-500/60"}`}
        >
          {isReady && <CheckCircle2 className="h-3 w-3 text-white" />}
        </button>

        <DeviceIcon deviceType={item.deviceType} />

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium">{item.label}</span>
            {isRequired && (
              <Badge variant="outline" className="text-[10px] font-mono border-amber-500/40 text-amber-400 px-1.5 py-0">
                Required
              </Badge>
            )}
          </div>
          <p className="text-xs font-mono text-muted-foreground mt-0.5">{item.requiredSize}</p>
          {item.notes && !expanded && (
            <p className="text-xs text-muted-foreground/70 mt-1 truncate">{item.notes}</p>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {isReady ? (
            <span className="text-[11px] font-mono text-green-500">Ready</span>
          ) : (
            <span className="text-[11px] font-mono text-muted-foreground/60">Pending</span>
          )}
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-muted-foreground/50 hover:text-foreground transition-colors"
          >
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {expanded && (
        <div className="px-3 pb-3 border-t border-border/30 pt-3 space-y-2">
          <p className="text-[11px] font-mono text-muted-foreground">Notes / location of screenshot file</p>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g. Saved in iCloud/Screenshots/WaitWise, or paste a URL..."
            className="text-sm min-h-[60px] bg-muted/30 border-border/50 resize-none"
          />
          <Button
            size="sm"
            onClick={saveNotes}
            disabled={saving}
            className="font-mono text-xs uppercase"
          >
            {saving ? "Saving..." : "Save Note"}
          </Button>
        </div>
      )}
    </div>
  );
}

export function AssetsPanel({ appId }: { appId: number }) {
  const [screenshots, setScreenshots] = useState<Screenshot[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/apps/${appId}/screenshots`, { credentials: "include" })
      .then((r) => r.json())
      .then((data) => {
        setScreenshots(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [appId]);

  async function handleUpdate(id: number, status: string, notes: string) {
    const res = await fetch(`/api/screenshots/${id}`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status, notes }),
    });
    if (res.ok) {
      const updated: Screenshot = await res.json();
      setScreenshots((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
    }
  }

  const readyCount = screenshots.filter((s) => s.status === "ready").length;
  const requiredSlots = screenshots.filter((s) => REQUIRED_DEVICE_TYPES.includes(s.deviceType));
  const requiredDone = requiredSlots.filter((s) => s.status === "ready").length;

  return (
    <div className="space-y-6">
      {/* Icon section */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-mono uppercase tracking-wider text-muted-foreground flex items-center gap-2">
            <AppWindow className="h-4 w-4" />
            App Icon
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 rounded-xl border-2 border-dashed border-border/50 bg-muted/20 flex items-center justify-center shrink-0">
              <ImageIcon className="h-6 w-6 text-muted-foreground/40" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium">1024 × 1024 px PNG</p>
              <p className="text-xs text-muted-foreground">No alpha channel. No rounded corners — Apple applies rounding automatically.</p>
              <div className="flex gap-3 mt-2">
                <div className="flex items-center gap-1.5 text-xs font-mono text-muted-foreground">
                  <div className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                  <span>Needed in Xcode Assets</span>
                </div>
                <div className="flex items-center gap-1.5 text-xs font-mono text-muted-foreground">
                  <div className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                  <span>Needed in App Store Connect</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Screenshots section */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-mono uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <ImageIcon className="h-4 w-4" />
              Screenshots
            </CardTitle>
            {!loading && screenshots.length > 0 && (
              <div className="flex items-center gap-3">
                <span className="text-xs font-mono text-muted-foreground">
                  {readyCount}/{screenshots.length} ready
                </span>
                {requiredSlots.length > 0 && requiredDone < requiredSlots.length && (
                  <Badge variant="outline" className="text-[10px] font-mono border-amber-500/40 text-amber-400">
                    {requiredSlots.length - requiredDone} required missing
                  </Badge>
                )}
                {requiredDone === requiredSlots.length && requiredSlots.length > 0 && (
                  <Badge variant="outline" className="text-[10px] font-mono border-green-500/40 text-green-400">
                    Required complete
                  </Badge>
                )}
              </div>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Tap a circle to mark a screenshot as ready. Add notes to record where the file is saved.
          </p>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-14 rounded-lg bg-muted/30 animate-pulse" />
              ))}
            </div>
          ) : screenshots.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Clock className="h-8 w-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">No screenshot slots found.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {screenshots.map((s) => (
                <ScreenshotSlot key={s.id} item={s} onUpdate={handleUpdate} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Apple requirements summary */}
      <Card className="bg-card/50 border-border/50">
        <CardContent className="pt-4 pb-4">
          <p className="text-xs font-mono text-muted-foreground font-semibold uppercase tracking-wider mb-2">Apple Requirements</p>
          <ul className="space-y-1.5 text-xs text-muted-foreground">
            <li className="flex items-start gap-2"><span className="text-amber-400 font-bold shrink-0">★</span>6.9" (iPhone 16 Pro Max) — Required</li>
            <li className="flex items-start gap-2"><span className="text-amber-400 font-bold shrink-0">★</span>6.5" (iPhone 14 Plus) — Required</li>
            <li className="flex items-start gap-2"><span className="text-muted-foreground/40 shrink-0">○</span>5.5" (iPhone 8 Plus) — Optional but recommended</li>
            <li className="flex items-start gap-2"><span className="text-muted-foreground/40 shrink-0">○</span>iPad sizes — Required only if app supports iPad</li>
            <li className="flex items-start gap-2 mt-2"><span className="shrink-0">→</span>Max 10 screenshots per device. Upload to App Store Connect → iOS App → Prepare for Submission.</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
