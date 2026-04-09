import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Check, Loader2, Zap } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface UpgradeModalProps {
  open: boolean;
  onClose: () => void;
  feature?: string;
}

const PLANS = [
  {
    key: "solo",
    name: "Solo",
    price: "$49",
    color: "border-sky-500/40 from-sky-950/30",
    badge: "text-sky-400 bg-sky-500/10 border-sky-500/20",
    button: "bg-sky-600 hover:bg-sky-500",
    features: ["1 active app pipeline", "Full analyzer engine", "Wizard + checklist", "Metadata workspace", "$199 per submission"],
  },
  {
    key: "builder",
    name: "Builder",
    price: "$99",
    popular: true,
    color: "border-violet-500/40 from-violet-950/40",
    badge: "text-violet-400 bg-violet-500/10 border-violet-500/20",
    button: "bg-violet-600 hover:bg-violet-500",
    features: ["Up to 3 active pipelines", "Everything in Solo", "Saved templates", "Reusable metadata blocks", "$179 per submission"],
  },
];

export function UpgradeModal({ open, onClose, feature }: UpgradeModalProps) {
  const [loading, setLoading] = useState<string | null>(null);
  const { toast } = useToast();
  const BASE = (import.meta.env.BASE_URL || "/").replace(/\/$/, "");

  async function handleUpgrade(planKey: string) {
    setLoading(planKey);
    try {
      const plansRes = await fetch(`${BASE}/api/stripe/plans`);
      const plansData = await plansRes.json();

      const plans: any[] = plansData.data || [];
      const planName = planKey === "solo" ? ["solo", "launch"] : ["builder"];
      const matched = plans.find((p: any) =>
        planName.some(n => p.name?.toLowerCase().includes(n))
      );

      if (!matched?.prices?.length) {
        window.location.href = `${BASE.replace("/api", "")}/pricing`;
        return;
      }

      const monthlyPrice = matched.prices.find((p: any) => p.recurring?.interval === "month");
      if (!monthlyPrice) {
        window.location.href = `${BASE}/pricing`;
        return;
      }

      const res = await fetch(`${BASE}/api/stripe/checkout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ priceId: monthlyPrice.id }),
        credentials: "include",
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error(data.error || "Checkout failed");
      }
    } catch (err: any) {
      toast({ title: "Upgrade failed", description: err.message, variant: "destructive" });
      setLoading(null);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-xl bg-card border-border">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-1">
            <div className="p-1.5 rounded-lg bg-violet-500/10">
              <Zap className="h-4 w-4 text-violet-400" />
            </div>
            <DialogTitle className="text-base font-semibold">
              Unlock full POSTAPP
            </DialogTitle>
          </div>
          <DialogDescription className="text-sm text-muted-foreground">
            {feature
              ? `${feature} is available on paid plans.`
              : "Upgrade to access the full analyzer, submission workflow, and pipeline automation."}
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
          {PLANS.map(plan => (
            <div
              key={plan.key}
              className={`relative rounded-xl border bg-gradient-to-b ${plan.color} to-card p-4 flex flex-col gap-3 ${plan.popular ? "ring-1 ring-violet-500/30" : ""}`}
            >
              {plan.popular && (
                <div className="absolute -top-2.5 left-1/2 -translate-x-1/2">
                  <span className="text-[10px] font-bold uppercase tracking-wider bg-violet-600 text-white px-2.5 py-0.5 rounded-full">
                    Most Popular
                  </span>
                </div>
              )}
              <div className="flex items-center justify-between">
                <span className="font-semibold text-sm">{plan.name}</span>
                <span className={`text-[10px] font-mono border px-2 py-0.5 rounded-full ${plan.badge}`}>
                  {plan.price}/mo
                </span>
              </div>
              <ul className="space-y-1.5 flex-1">
                {plan.features.map(f => (
                  <li key={f} className="flex items-start gap-2 text-xs text-muted-foreground">
                    <Check className="h-3 w-3 text-green-500 shrink-0 mt-0.5" />
                    {f}
                  </li>
                ))}
              </ul>
              <Button
                size="sm"
                className={`w-full text-white text-xs font-semibold ${plan.button}`}
                disabled={loading === plan.key}
                onClick={() => handleUpgrade(plan.key)}
              >
                {loading === plan.key
                  ? <><Loader2 className="h-3 w-3 mr-1 animate-spin" /> Redirecting…</>
                  : `Get ${plan.name}`}
              </Button>
            </div>
          ))}
        </div>

        <p className="text-[11px] text-muted-foreground/60 text-center mt-1">
          Submission fees apply only when you move into final pipeline orchestration.
        </p>
      </DialogContent>
    </Dialog>
  );
}
