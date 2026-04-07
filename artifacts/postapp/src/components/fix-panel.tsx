import { AlertTriangle, ExternalLink, ArrowRight, Info } from "lucide-react";
import { ChecklistAction, MODAL_LIBRARY } from "@/data/checklist-meta";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useState } from "react";

interface BlockerItem {
  id: number;
  label: string;
  actions: ChecklistAction[];
}

interface FixPanelProps {
  blockers: BlockerItem[];
  onInternalNav: (target: string) => void;
}

export function FixPanel({ blockers, onInternalNav }: FixPanelProps) {
  const [modalKey, setModalKey] = useState<string | null>(null);
  const modal = modalKey ? MODAL_LIBRARY[modalKey] : null;

  if (blockers.length === 0) return null;

  function handleAction(action: ChecklistAction) {
    if (action.type === "external") {
      window.open(action.target, "_blank", "noopener,noreferrer");
    } else if (action.type === "modal") {
      setModalKey(action.target);
    } else if (action.type === "internal") {
      onInternalNav(action.target);
    }
  }

  const top = blockers.slice(0, 3);

  return (
    <>
      <div className="rounded-xl border border-red-500/30 bg-red-500/5 overflow-hidden mb-6">
        <div className="flex items-center justify-between px-4 py-3 border-b border-red-500/20 bg-red-500/10">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-red-400" />
            <span className="font-mono text-sm font-semibold text-red-400 uppercase tracking-wider">
              Fix Critical Issues
            </span>
          </div>
          <span className="font-mono text-xs font-bold text-red-400 bg-red-500/20 border border-red-500/30 rounded-full px-2 py-0.5">
            {blockers.length} blocker{blockers.length !== 1 ? "s" : ""}
          </span>
        </div>

        <div className="divide-y divide-red-500/10">
          {top.map((item) => (
            <div key={item.id} className="p-4 flex flex-col sm:flex-row sm:items-center gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium leading-snug">{item.label}</p>
              </div>
              {item.actions.length > 0 && (
                <div className="flex flex-wrap gap-2 shrink-0">
                  {item.actions.slice(0, 2).map((action, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleAction(action)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md text-[11px] font-mono font-semibold bg-red-500/10 border border-red-500/30 text-red-300 hover:bg-red-500/20 transition-colors"
                    >
                      {action.type === "external" && <ExternalLink className="h-2.5 w-2.5" />}
                      {action.type === "internal" && <ArrowRight className="h-2.5 w-2.5" />}
                      {action.type === "modal" && <Info className="h-2.5 w-2.5" />}
                      {action.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}

          {blockers.length > 3 && (
            <div className="px-4 py-2.5 text-xs font-mono text-red-400/60 text-center">
              +{blockers.length - 3} more critical issue{blockers.length - 3 !== 1 ? "s" : ""} — resolve above first
            </div>
          )}
        </div>
      </div>

      {modal && (
        <Dialog open={!!modal} onOpenChange={() => setModalKey(null)}>
          <DialogContent className="max-w-md bg-card border-border">
            <DialogHeader>
              <DialogTitle className="font-mono text-base">{modal.title}</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">{modal.body}</p>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
