import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Loader2, Send, ShieldCheck, ArrowRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface SubmissionOption {
  key: string;
  label: string;
  price: string;
  description: string;
}

const OPTIONS: SubmissionOption[] = [
  {
    key: "standard",
    label: "Standard Submission",
    price: "$199",
    description: "Full pipeline orchestration — build, sign, validate, submit to App Store",
  },
  {
    key: "complex",
    label: "Complex App Submission",
    price: "$349",
    description: "For apps with custom entitlements, IAP, or non-standard requirements",
  },
  {
    key: "resubmission",
    label: "Resubmission / Appeal",
    price: "$99",
    description: "Rejection analysis, fix guidance, and resubmission support",
  },
];

interface SubmissionCheckoutModalProps {
  open: boolean;
  onClose: () => void;
  appId: number | string;
  appName?: string;
}

export function SubmissionCheckoutModal({ open, onClose, appId, appName }: SubmissionCheckoutModalProps) {
  const [selected, setSelected] = useState("standard");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const BASE = (import.meta.env.BASE_URL || "/").replace(/\/$/, "");

  const selectedOption = OPTIONS.find(o => o.key === selected)!;

  async function handleCheckout() {
    setLoading(true);
    try {
      const res = await fetch(`${BASE}/api/stripe/checkout/submission`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ appId, submissionType: selected }),
        credentials: "include",
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error(data.error || "Checkout failed");
      }
    } catch (err: any) {
      toast({ title: "Checkout failed", description: err.message, variant: "destructive" });
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md bg-card border-border">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-1">
            <div className="p-1.5 rounded-lg bg-green-500/10">
              <Send className="h-4 w-4 text-green-400" />
            </div>
            <DialogTitle className="text-base font-semibold">
              Submit to App Store
            </DialogTitle>
          </div>
          <DialogDescription className="text-sm text-muted-foreground">
            {appName ? (
              <>Launching submission pipeline for <span className="text-foreground font-medium">{appName}</span>.</>
            ) : (
              "Choose a submission type to begin the pipeline."
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 mt-2">
          <RadioGroup value={selected} onValueChange={setSelected} className="space-y-2">
            {OPTIONS.map(opt => (
              <div
                key={opt.key}
                onClick={() => setSelected(opt.key)}
                className={`relative flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                  selected === opt.key
                    ? "border-violet-500/50 bg-violet-500/5"
                    : "border-border hover:border-border/80 hover:bg-muted/20"
                }`}
              >
                <RadioGroupItem value={opt.key} id={opt.key} className="mt-0.5 shrink-0" />
                <Label htmlFor={opt.key} className="cursor-pointer flex-1 space-y-0.5">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{opt.label}</span>
                    <span className="text-sm font-bold text-foreground">{opt.price}</span>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">{opt.description}</p>
                </Label>
              </div>
            ))}
          </RadioGroup>

          <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/20 border border-border/40">
            <ShieldCheck className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
            <p className="text-xs text-muted-foreground leading-relaxed">
              If your app is rejected and POSTAPP cannot identify a path forward, we'll credit your submission fee.
            </p>
          </div>

          <Button
            className="w-full bg-violet-600 hover:bg-violet-500 text-white font-semibold"
            disabled={loading}
            onClick={handleCheckout}
          >
            {loading ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Redirecting to checkout…</>
            ) : (
              <>Pay {selectedOption.price} — Begin Submission <ArrowRight className="h-4 w-4 ml-1.5" /></>
            )}
          </Button>
          <p className="text-[11px] text-muted-foreground/60 text-center">
            Secure payment via Stripe. No recurring charge for this submission.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
