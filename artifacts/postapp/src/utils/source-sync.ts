export type FieldStatus = "missing" | "manual" | "verified" | "modified";

export const FIELD_STATUS_LABELS: Record<FieldStatus, string> = {
  missing: "Missing",
  manual: "Manual",
  verified: "Verified",
  modified: "Modified",
};

export const FIELD_STATUS_STYLES: Record<FieldStatus, string> = {
  missing: "bg-red-500/10 text-red-400 border-red-500/20",
  manual: "bg-blue-500/10 text-blue-400 border-blue-400/20",
  verified: "bg-green-500/10 text-green-400 border-green-500/20",
  modified: "bg-amber-500/10 text-amber-400 border-amber-500/20",
};

export function getFieldStatus(current?: string, detected?: string): FieldStatus {
  const c = (current ?? "").trim();
  const d = (detected ?? "").trim();
  if (!c && !d) return "missing";
  if (!c && d) return "missing";
  if (c && !d) return "manual";
  if (c === d) return "verified";
  return "modified";
}
