import { ChecklistStatus, ChecklistAction, MODAL_LIBRARY } from "@/data/checklist-meta";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ExternalLink, Info, ArrowRight, AlertTriangle, CheckCircle2, Clock } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

interface ChecklistItemCardProps {
  id: number;
  label: string;
  completed: boolean;
  status: ChecklistStatus;
  blocker: boolean;
  helpText: string;
  actions: ChecklistAction[];
  onToggle: (id: number, checked: boolean) => void;
  onInternalNav: (target: string) => void;
}

function StatusChip({ status }: { status: ChecklistStatus }) {
  if (status === "complete") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold uppercase tracking-wider bg-green-500/10 text-green-400 border border-green-500/20">
        <CheckCircle2 className="h-2.5 w-2.5" />
        Complete
      </span>
    );
  }
  if (status === "missing") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold uppercase tracking-wider bg-red-500/10 text-red-400 border border-red-500/20">
        <AlertTriangle className="h-2.5 w-2.5" />
        Missing
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold uppercase tracking-wider bg-amber-500/10 text-amber-400 border border-amber-500/20">
      <Clock className="h-2.5 w-2.5" />
      Needs Review
    </span>
  );
}

export function ChecklistItemCard({
  id,
  label,
  completed,
  status,
  blocker,
  helpText,
  actions,
  onToggle,
  onInternalNav,
}: ChecklistItemCardProps) {
  const [modalKey, setModalKey] = useState<string | null>(null);
  const modal = modalKey ? MODAL_LIBRARY[modalKey] : null;

  function handleAction(action: ChecklistAction) {
    if (action.type === "external") {
      window.open(action.target, "_blank", "noopener,noreferrer");
    } else if (action.type === "modal") {
      setModalKey(action.target);
    } else if (action.type === "internal") {
      onInternalNav(action.target);
    }
  }

  return (
    <>
      <div
        className={cn(
          "flex gap-3 p-4 transition-colors",
          completed && "opacity-60",
          blocker && !completed && "border-l-2 border-l-red-500/60",
        )}
      >
        <div className="pt-0.5 shrink-0">
          <Checkbox
            id={`chk-${id}`}
            checked={completed}
            onCheckedChange={(v) => onToggle(id, v as boolean)}
            className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
          />
        </div>

        <div className="flex-1 min-w-0 space-y-2">
          <div className="flex flex-wrap items-start gap-2">
            <label
              htmlFor={`chk-${id}`}
              className={cn(
                "text-sm font-medium leading-snug cursor-pointer flex-1",
                completed && "line-through text-muted-foreground",
              )}
            >
              {label}
            </label>
            <StatusChip status={status} />
          </div>

          {helpText && !completed && (
            <p className="text-xs text-muted-foreground flex gap-1.5 items-start leading-relaxed">
              <Info className="h-3 w-3 mt-0.5 shrink-0 text-primary/50" />
              {helpText}
            </p>
          )}

          {!completed && actions.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-1">
              {actions.map((action, idx) => (
                <button
                  key={idx}
                  onClick={() => handleAction(action)}
                  className={cn(
                    "inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-mono font-medium transition-colors border",
                    action.type === "external"
                      ? "bg-transparent border-border/60 text-muted-foreground hover:text-foreground hover:border-border"
                      : action.type === "modal"
                        ? "bg-primary/5 border-primary/20 text-primary/80 hover:bg-primary/10 hover:text-primary"
                        : "bg-blue-500/10 border-blue-500/20 text-blue-400 hover:bg-blue-500/20",
                  )}
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
