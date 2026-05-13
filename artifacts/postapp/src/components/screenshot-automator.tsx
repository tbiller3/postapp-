import { useState, useRef, useCallback } from "react";
import { useAppleConnectStore } from "@/state/apple-connect-store";
import { ImageIcon, Upload, CheckCircle2, XCircle, Loader2, MonitorSmartphone, Trash2, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

// ── Device display types ──────────────────────────────────────────────────
const DISPLAY_TYPES = [
  { id: "APP_IPHONE_67",         label: "iPhone 15 Pro Max",  size: "1290 × 2796",  required: true  },
  { id: "APP_IPHONE_65",         label: "iPhone 11 Pro Max",  size: "1242 × 2688",  required: true  },
  { id: "APP_IPHONE_55",         label: "iPhone 8 Plus",      size: "1242 × 2208",  required: false },
  { id: "APP_IPAD_PRO_3GEN_129", label: "iPad Pro 12.9\"",    size: "2048 × 2732",  required: false },
] as const;

type DisplayTypeId = typeof DISPLAY_TYPES[number]["id"];

interface ScreenshotSlot {
  displayType: DisplayTypeId;
  file: File | null;
  previewUrl: string | null;
  status: "idle" | "resizing" | "uploading" | "done" | "error";
  error: string | null;
  screenshotId: string | null;
}

// ── Canvas-based resize (browser-native, no server) ────────────────────────
async function resizeToTarget(file: File, targetW: number, targetH: number): Promise<{ base64: string; mimeType: string }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const canvas = document.createElement("canvas");
      canvas.width = targetW;
      canvas.height = targetH;
      const ctx = canvas.getContext("2d");
      if (!ctx) { reject(new Error("Canvas not available")); return; }

      // Fill background black (safe default for screenshots)
      ctx.fillStyle = "#000000";
      ctx.fillRect(0, 0, targetW, targetH);

      // Fit image maintaining aspect ratio, centered
      const scale = Math.min(targetW / img.width, targetH / img.height);
      const dw = img.width * scale;
      const dh = img.height * scale;
      const dx = (targetW - dw) / 2;
      const dy = (targetH - dh) / 2;
      ctx.drawImage(img, dx, dy, dw, dh);

      const base64 = canvas.toDataURL("image/png").split(",")[1];
      resolve({ base64, mimeType: "image/png" });
    };
    img.onerror = () => reject(new Error("Failed to load image"));
    img.src = url;
  });
}

// ── Single screenshot slot ─────────────────────────────────────────────────
function ScreenshotSlotCard({
  slot,
  displayInfo,
  onFileSelected,
  onUpload,
  onClear,
  appleConnected,
}: {
  slot: ScreenshotSlot;
  displayInfo: typeof DISPLAY_TYPES[number];
  onFileSelected: (file: File) => void;
  onUpload: () => void;
  onClear: () => void;
  appleConnected: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith("image/")) onFileSelected(file);
  };

  const statusIcon = () => {
    if (slot.status === "resizing" || slot.status === "uploading") return <Loader2 className="h-4 w-4 animate-spin text-violet-400" />;
    if (slot.status === "done") return <CheckCircle2 className="h-4 w-4 text-green-400" />;
    if (slot.status === "error") return <XCircle className="h-4 w-4 text-red-400" />;
    return null;
  };

  const statusLabel = () => {
    if (slot.status === "resizing") return "Resizing…";
    if (slot.status === "uploading") return "Uploading to Apple…";
    if (slot.status === "done") return "Uploaded ✓";
    if (slot.status === "error") return slot.error ?? "Error";
    return null;
  };

  return (
    <div className="rounded-xl border border-border/40 overflow-hidden bg-card">
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-border/30 bg-muted/10">
        <MonitorSmartphone className="h-3.5 w-3.5 text-muted-foreground/60 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold font-mono text-foreground/80 truncate">{displayInfo.label}</p>
          <p className="text-[10px] text-muted-foreground/50">{displayInfo.size} px</p>
        </div>
        {displayInfo.required && (
          <span className="text-[9px] font-mono uppercase px-1.5 py-0.5 rounded bg-violet-500/10 text-violet-400 border border-violet-500/20 shrink-0">Required</span>
        )}
        {slot.file && slot.status === "idle" && (
          <button onClick={onClear} className="text-muted-foreground/40 hover:text-red-400 transition-colors">
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Drop zone / preview */}
      <div
        className={cn(
          "relative cursor-pointer transition-all",
          slot.previewUrl ? "" : "h-48",
          dragOver && "bg-violet-950/20",
        )}
        onDragOver={e => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => !slot.previewUrl && inputRef.current?.click()}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={e => { const f = e.target.files?.[0]; if (f) onFileSelected(f); }}
        />

        {slot.previewUrl ? (
          <div className="relative">
            <img
              src={slot.previewUrl}
              alt={displayInfo.label}
              className="w-full object-cover max-h-64"
            />
            {(slot.status === "uploading" || slot.status === "resizing") && (
              <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-violet-400" />
              </div>
            )}
            {slot.status === "done" && (
              <div className="absolute top-2 right-2">
                <CheckCircle2 className="h-6 w-6 text-green-400 drop-shadow-lg" />
              </div>
            )}
          </div>
        ) : (
          <div className={cn(
            "h-full flex flex-col items-center justify-center gap-3 border-2 border-dashed rounded-b-xl transition-colors",
            dragOver ? "border-violet-500/60 bg-violet-950/10" : "border-border/30 hover:border-violet-500/30 hover:bg-muted/10",
          )}>
            <div className="h-10 w-10 rounded-full bg-muted/20 flex items-center justify-center">
              <Upload className="h-5 w-5 text-muted-foreground/40" />
            </div>
            <div className="text-center">
              <p className="text-xs text-muted-foreground/60">Drop screenshot here</p>
              <p className="text-[10px] text-muted-foreground/40 mt-0.5">Any size — auto-resized to {displayInfo.size}</p>
            </div>
          </div>
        )}
      </div>

      {/* Status / upload button */}
      <div className="px-3 py-2.5 border-t border-border/30 flex items-center gap-2">
        {statusIcon()}
        {statusLabel() && (
          <p className={cn(
            "text-[11px] font-mono flex-1",
            slot.status === "done" ? "text-green-400" : slot.status === "error" ? "text-red-400" : "text-muted-foreground/60",
          )}>
            {statusLabel()}
          </p>
        )}
        {slot.file && slot.status === "idle" && appleConnected && (
          <button
            onClick={onUpload}
            className="ml-auto inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-[11px] font-semibold font-mono transition-colors"
          >
            <Upload className="h-3 w-3" /> Upload to Apple
          </button>
        )}
        {slot.file && !appleConnected && slot.status === "idle" && (
          <p className="ml-auto text-[10px] text-amber-400/70 flex items-center gap-1">
            <AlertTriangle className="h-3 w-3" /> Connect Apple first
          </p>
        )}
        {!slot.file && !slot.previewUrl && (
          <p className="text-[10px] text-muted-foreground/30 font-mono flex-1">No file selected</p>
        )}
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────
export function ScreenshotAutomator() {
  const { status: appleStatus, selectedAppId, versions } = useAppleConnectStore();
  const appleConnected = appleStatus === "connected" && !!selectedAppId;

  // Find an open version ID
  const openVersion = versions.find(v => v.attributes.appStoreState === "PREPARE_FOR_SUBMISSION");
  const versionId = openVersion?.id ?? null;

  const [slots, setSlots] = useState<Record<DisplayTypeId, ScreenshotSlot>>(
    Object.fromEntries(
      DISPLAY_TYPES.map(dt => [dt.id, { displayType: dt.id as DisplayTypeId, file: null, previewUrl: null, status: "idle", error: null, screenshotId: null }])
    ) as Record<DisplayTypeId, ScreenshotSlot>
  );

  const updateSlot = useCallback((id: DisplayTypeId, patch: Partial<ScreenshotSlot>) => {
    setSlots(prev => ({ ...prev, [id]: { ...prev[id], ...patch } }));
  }, []);

  const handleFileSelected = useCallback((displayTypeId: DisplayTypeId, file: File) => {
    const previewUrl = URL.createObjectURL(file);
    updateSlot(displayTypeId, { file, previewUrl, status: "idle", error: null, screenshotId: null });
  }, [updateSlot]);

  const handleUpload = useCallback(async (displayTypeId: DisplayTypeId) => {
    const slot = slots[displayTypeId];
    if (!slot.file || !selectedAppId) return;

    const displayInfo = DISPLAY_TYPES.find(d => d.id === displayTypeId)!;

    updateSlot(displayTypeId, { status: "resizing", error: null });
    try {
      // Resize in browser using Canvas
      const { base64, mimeType } = await resizeToTarget(slot.file, displayInfo.size.split(" × ").map(Number)[0], displayInfo.size.split(" × ").map(Number)[1]);

      updateSlot(displayTypeId, { status: "uploading" });

      const res = await fetch(`${BASE}/api/apple/screenshots/upload`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          appleAppId: selectedAppId,
          displayType: displayTypeId,
          fileName: `${displayTypeId.toLowerCase()}.png`,
          mimeType,
          imageBase64: base64,
          ...(versionId ? { versionId } : {}),
        }),
      });

      const data = await res.json() as { ok?: boolean; screenshotId?: string; error?: string };
      if (!data.ok) throw new Error(data.error ?? "Upload failed");

      updateSlot(displayTypeId, { status: "done", screenshotId: data.screenshotId ?? null });
    } catch (e) {
      updateSlot(displayTypeId, { status: "error", error: e instanceof Error ? e.message : "Upload failed" });
    }
  }, [slots, selectedAppId, versionId, updateSlot]);

  const handleClear = useCallback((displayTypeId: DisplayTypeId) => {
    const slot = slots[displayTypeId];
    if (slot.previewUrl) URL.revokeObjectURL(slot.previewUrl);
    updateSlot(displayTypeId, { file: null, previewUrl: null, status: "idle", error: null, screenshotId: null });
  }, [slots, updateSlot]);

  const uploadAll = async () => {
    for (const dt of DISPLAY_TYPES) {
      const slot = slots[dt.id];
      if (slot.file && slot.status === "idle") await handleUpload(dt.id);
    }
  };

  const pendingCount = DISPLAY_TYPES.filter(dt => slots[dt.id].file && slots[dt.id].status === "idle").length;
  const doneCount = DISPLAY_TYPES.filter(dt => slots[dt.id].status === "done").length;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <ImageIcon className="h-4 w-4 text-blue-400" />
            <h2 className="text-sm font-bold font-mono uppercase tracking-widest">Screenshot Automator</h2>
          </div>
          <p className="text-xs text-muted-foreground/60">
            Drop any image — PostApp resizes it to exact Apple specs and uploads directly to App Store Connect.
          </p>
        </div>
        {pendingCount > 0 && (
          <button
            onClick={uploadAll}
            disabled={!appleConnected}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold font-mono disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <Upload className="h-3.5 w-3.5" />
            Upload All ({pendingCount})
          </button>
        )}
      </div>

      {/* Status bar */}
      {doneCount > 0 && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-green-950/20 border border-green-500/20">
          <CheckCircle2 className="h-3.5 w-3.5 text-green-400" />
          <p className="text-xs text-green-400">{doneCount} screenshot{doneCount > 1 ? "s" : ""} uploaded to App Store Connect</p>
        </div>
      )}

      {!appleConnected && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-950/20 border border-amber-500/20">
          <AlertTriangle className="h-3.5 w-3.5 text-amber-400" />
          <p className="text-xs text-amber-400/80">Connect Apple in the Apple Connect tab to enable uploads. You can still drop and preview screenshots now.</p>
        </div>
      )}

      {!versionId && appleConnected && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/20 border border-border/40">
          <AlertTriangle className="h-3.5 w-3.5 text-amber-400" />
          <p className="text-xs text-muted-foreground/70">No open submission version found. Run the Auto-Submit pipeline first to create a version slot.</p>
        </div>
      )}

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {DISPLAY_TYPES.map(dt => (
          <ScreenshotSlotCard
            key={dt.id}
            slot={slots[dt.id]}
            displayInfo={dt}
            onFileSelected={file => handleFileSelected(dt.id, file)}
            onUpload={() => handleUpload(dt.id)}
            onClear={() => handleClear(dt.id)}
            appleConnected={appleConnected}
          />
        ))}
      </div>

      <p className="text-[10px] text-muted-foreground/30 text-center">
        Images are resized client-side using Canvas — your original files are never sent to PostApp servers.
      </p>
    </div>
  );
}
