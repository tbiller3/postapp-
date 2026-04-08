export type VerificationState = "missing" | "needs-review" | "complete" | "mismatch";

export function verifyField(current?: string, detected?: string): VerificationState {
  const c = (current ?? "").trim();
  const d = (detected ?? "").trim();
  if (!c) return "missing";
  if (!d) return "needs-review";
  if (c === d) return "complete";
  return "mismatch";
}

export function verifyBoolean(
  current: boolean,
  expected?: boolean,
): VerificationState {
  if (typeof expected === "undefined") return "needs-review";
  return current === expected ? "complete" : "mismatch";
}

export const VERIFICATION_LABELS: Record<VerificationState, string> = {
  missing: "Missing",
  "needs-review": "Needs Review",
  complete: "Complete",
  mismatch: "Mismatch",
};

export const VERIFICATION_STYLES: Record<VerificationState, string> = {
  missing: "bg-red-500/10 text-red-400 border-red-500/20",
  "needs-review": "bg-blue-500/10 text-blue-400 border-blue-400/20",
  complete: "bg-green-500/10 text-green-400 border-green-500/20",
  mismatch: "bg-amber-500/10 text-amber-400 border-amber-500/20",
};
