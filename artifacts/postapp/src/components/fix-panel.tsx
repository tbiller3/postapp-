import { AlertTriangle, ExternalLink, ArrowRight, Info, XCircle, Zap } from "lucide-react";
import { ChecklistAction, MODAL_LIBRARY } from "@/data/checklist-meta";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useState } from "react";

export type FieldIssue = {
  key: string;
  label: string;
  fieldStatus: "missing" | "modified";
};

interface BlockerItem {
  id: number;
  label: string;
  actions: ChecklistAction[];
}

interface FixPanelProps {
  blockers: BlockerItem[];
  fieldIssues?: FieldIssue[];
  onInternalNav: (target: string) => void;
}

type UnifiedIssue =
  | { kind: "field-missing"; label: string; fieldKey: string }
  | { kind: "field-modified"; label: string; fieldKey: string }
  | { kind: "checklist"; label: string; actions: ChecklistAction[] };

export function FixPanel({ blockers, fieldIssues = [], onInternalNav }: FixPanelProps) {
  const [modalKey, setModalKey] = useState<string | null>(null);
  const modal = modalKey ? MODAL_LIBRARY[modalKey] : null;

  const unified: UnifiedIssue[] = [
    ...fieldIssues
      .filter((f) => f.fieldStatus === "missing")
      .map((f): UnifiedIssue => ({ kind: "field-missing", label: f.label, fieldKey: f.key })),
    ...fieldIssues
      .filter((f) => f.fieldStatus === "modified")
      .map((f): UnifiedIssue => ({ kind: "field-modified", label: f.label, fieldKey: f.key })),
    ...blockers.map((b): UnifiedIssue => ({ kind: "checklist", label: b.label, actions: b.actions })),
  ];

  if (unified.length === 0) return null;

  const total = unified.length;
  const top = unified.slice(0, 3);

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
      <div className="rounded-xl border border-red-500/30 bg-red-500/5 overflow-hidden mb-6">
        <div className="flex items-center justify-between px-4 py-3 border-b border-red-500/20 bg-red-500/10">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-red-400" />
            <span className="font-mono text-sm font-semibold text-red-400 uppercase tracking-wider">
              Fix This Next
            </span>
          </div>
          <span className="font-mono text-xs font-bold text-red-400 bg-red-500/20 border border-red-500/30 rounded-full px-2 py-0.5">
            {total} issue{total !== 1 ? "s" : ""}
          </span>
        </div>

        <div className="divide-y divide-red-500/10">
          {top.map((issue, idx) => (
            <div key={idx} className="p-4 flex flex-col sm:flex-row sm:items-center gap-3">
              <div className="flex-1 min-w-0 flex items-start gap-2">
                {issue.kind === "field-missing" && <XCircle className="h-3.5 w-3.5 text-red-400 mt-0.5 shrink-0" />}
                {issue.kind === "field-modified" && <Zap className="h-3.5 w-3.5 text-amber-400 mt-0.5 shrink-0" />}
                {issue.kind === "checklist" && <AlertTriangle className="h-3.5 w-3.5 text-red-400 mt-0.5 shrink-0" />}
                <div>
                  <p className="text-sm font-medium leading-snug">{issue.label}</p>
                  {issue.kind === "field-missing" && (
                    <p className="text-[11px] font-mono text-red-400/60 mt-0.5">Field is empty — required for submission</p>
                  )}
                  {issue.kind === "field-modified" && (
                    <p className="text-[11px] font-mono text-amber-400/60 mt-0.5">Value changed from detected — review before submitting</p>
                  )}
                </div>
              </div>
              <div className="flex flex-wrap gap-2 shrink-0">
                {issue.kind !== "checklist" && (
                  <button
                    onClick={() => onInternalNav("submission")}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md text-[11px] font-mono font-semibold bg-red-500/10 border border-red-500/30 text-red-300 hover:bg-red-500/20 transition-colors"
                  >
                    <ArrowRight className="h-2.5 w-2.5" />
                    Open Submission Data
                  </button>
                )}
                {issue.kind === "checklist" &&
                  issue.actions.slice(0, 2).map((action, i) => (
                    <button
                      key={i}
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
            </div>
          ))}

          {total > 3 && (
            <div className="px-4 py-2.5 text-xs font-mono text-red-400/60 text-center">
              +{total - 3} more issue{total - 3 !== 1 ? "s" : ""} — resolve above first
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
