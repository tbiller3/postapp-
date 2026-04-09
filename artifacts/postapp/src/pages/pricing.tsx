import { useEffect, useState } from "react";
import { Check, Zap, Loader2, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

interface Price {
  id: string;
  unit_amount: number;
  currency: string;
  recurring: any;
  nickname: string | null;
}

interface Plan {
  id: string;
  name: string;
  description: string;
  metadata: Record<string, string>;
  prices: Price[];
}

function fmt(cents: number) {
  return `$${(cents / 100).toFixed(cents % 100 === 0 ? 0 : 2)}`;
}

const TIER_COLORS: Record<string, { badge: string; button: string; ring: string; glow: string }> = {
  "1": {
    badge: "text-sky-400 bg-sky-500/10 border-sky-500/20",
    button: "bg-sky-600 hover:bg-sky-500 text-white",
    ring: "border-sky-500/20",
    glow: "from-sky-950/30 to-card",
  },
  "2": {
    badge: "text-violet-400 bg-violet-500/10 border-violet-500/20",
    button: "bg-violet-600 hover:bg-violet-500 text-white",
    ring: "border-violet-500/40",
    glow: "from-violet-950/40 to-card",
  },
  "3": {
    badge: "text-amber-400 bg-amber-500/10 border-amber-500/20",
    button: "bg-amber-600 hover:bg-amber-500 text-white",
    ring: "border-amber-500/20",
    glow: "from-amber-950/30 to-card",
  },
};

const TIER_FEATURES: Record<string, string[]> = {
  "1": [
    "2 app submissions included/mo",
    "$19 per additional submission",
    "Automated Codemagic builds",
    "GitHub sync",
    "App Store metadata tracking",
    "Email support",
  ],
  "2": [
    "10 app submissions included/mo",
    "$9 per additional submission",
    "Automated Codemagic builds",
    "GitHub sync",
    "App Store metadata tracking",
    "Priority email support",
    "Build status notifications",
  ],
  "3": [
    "Unlimited app submissions",
    "$2.90 per additional submission",
    "Automated Codemagic builds",
    "GitHub sync",
    "App Store metadata tracking",
    "Priority support (chat)",
    "Build status notifications",
    "Early access to new features",
  ],
};

export default function PricingPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [checkingOut, setCheckingOut] = useState<string | null>(null);
  const { toast } = useToast();

  const success = new URLSearchParams(window.location.search).get("success");
  const canceled = new URLSearchParams(window.location.search).get("canceled");

  useEffect(() => {
    if (success) toast({ title: "Subscription activated!", description: "Welcome aboard. Your plan is now active." });
    if (canceled) toast({ title: "Checkout canceled", description: "No charge was made." });
  }, []);

  useEffect(() => {
    const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
    fetch(`${BASE}/api/stripe/plans`)
      .then(r => r.json())
      .then(d => {
        const sorted = (d.data || []).sort((a: Plan, b: Plan) =>
          parseInt(a.metadata?.tier || "0") - parseInt(b.metadata?.tier || "0")
        );
        setPlans(sorted);
      })
      .catch(() => toast({ title: "Failed to load plans", variant: "destructive" }))
      .finally(() => setLoading(false));
  }, []);

  async function handleCheckout(priceId: string) {
    setCheckingOut(priceId);
    try {
      const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
      const res = await fetch(`${BASE}/api/stripe/checkout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ priceId }),
        credentials: "include",
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error(data.error || "Unknown error");
      }
    } catch (err: any) {
      toast({ title: "Checkout failed", description: err.message, variant: "destructive" });
    } finally {
      setCheckingOut(null);
    }
  }

  return (
    <div className="space-y-10">
      {/* Header */}
      <div className="text-center space-y-3 max-w-2xl mx-auto">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-400 text-xs font-mono mb-2">
          <Zap className="h-3 w-3" />
          POSTAPP Pricing
        </div>
        <h1 className="text-3xl font-bold tracking-tight">
          Ship more, stress less.
        </h1>
        <p className="text-muted-foreground text-sm leading-relaxed">
          One-tap iOS builds and App Store submission — fully automated.
          Choose the plan that fits how fast you ship.
        </p>
      </div>

      {/* Plan cards */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {plans.map(plan => {
            const tier = plan.metadata?.tier || "1";
            const colors = TIER_COLORS[tier] || TIER_COLORS["1"];
            const features = TIER_FEATURES[tier] || [];
            const isPopular = tier === "2";

            const monthlyPrice = plan.prices.find(p => p.recurring?.interval === "month");
            const perSubmissionPrice = plan.prices.find(p => !p.recurring);

            return (
              <div key={plan.id} className="relative">
                {isPopular && (
                  <div className="absolute -top-3 left-0 right-0 flex justify-center z-10">
                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-violet-600 text-white text-[10px] font-bold uppercase tracking-wider shadow-lg">
                      <Star className="h-3 w-3" />
                      Most Popular
                    </span>
                  </div>
                )}
                <Card className={`h-full bg-gradient-to-b ${colors.glow} border ${colors.ring} flex flex-col ${isPopular ? "ring-1 ring-violet-500/30 shadow-lg shadow-violet-900/20" : ""}`}>
                  <CardHeader className="pb-4">
                    <div className="flex items-start justify-between gap-2 flex-wrap">
                      <CardTitle className="text-base font-semibold">
                        {plan.name.replace("POSTAPP ", "")}
                      </CardTitle>
                      {plan.metadata?.highlight && (
                        <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border ${colors.badge}`}>
                          {plan.metadata.highlight}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed mt-1">
                      {plan.description}
                    </p>

                    {/* Pricing display */}
                    <div className="pt-3 space-y-1">
                      {monthlyPrice && (
                        <div className="flex items-baseline gap-1">
                          <span className="text-3xl font-bold">
                            {fmt(monthlyPrice.unit_amount)}
                          </span>
                          <span className="text-sm text-muted-foreground">/month</span>
                        </div>
                      )}
                      {perSubmissionPrice && (
                        <p className="text-xs text-muted-foreground">
                          + {fmt(perSubmissionPrice.unit_amount)} per additional submission
                        </p>
                      )}
                    </div>
                  </CardHeader>

                  <CardContent className="flex-1 flex flex-col gap-6">
                    {/* Features */}
                    <ul className="space-y-2">
                      {features.map(f => (
                        <li key={f} className="flex items-start gap-2 text-xs text-muted-foreground">
                          <Check className="h-3.5 w-3.5 text-green-500 shrink-0 mt-0.5" />
                          {f}
                        </li>
                      ))}
                    </ul>

                    {/* CTA */}
                    <div className="mt-auto space-y-2">
                      {monthlyPrice && (
                        <Button
                          className={`w-full text-sm font-semibold ${colors.button}`}
                          disabled={checkingOut === monthlyPrice.id}
                          onClick={() => handleCheckout(monthlyPrice.id)}
                        >
                          {checkingOut === monthlyPrice.id
                            ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Redirecting…</>
                            : `Get ${plan.name.replace("POSTAPP ", "")} — ${fmt(monthlyPrice.unit_amount)}/mo`
                          }
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            );
          })}
        </div>
      )}

      {/* Revenue projection */}
      <Card className="bg-muted/20 border-border/60 max-w-2xl mx-auto">
        <CardContent className="pt-6 space-y-4">
          <h3 className="text-sm font-semibold font-mono uppercase tracking-wider text-muted-foreground">
            Revenue Potential at 165 Users
          </h3>
          <div className="grid grid-cols-3 gap-4 text-center">
            {[
              { label: "Launch (55 users)", mo: "$19", rev: "$1,045/mo" },
              { label: "Builder (75 users)", mo: "$49", rev: "$3,675/mo" },
              { label: "Studio (35 users)", mo: "$149", rev: "$5,215/mo" },
            ].map(r => (
              <div key={r.label} className="space-y-1">
                <p className="text-[10px] font-mono text-muted-foreground/60 uppercase">{r.label}</p>
                <p className="text-lg font-bold">{r.rev}</p>
                <p className="text-[10px] text-muted-foreground">{r.mo}/user/mo</p>
              </div>
            ))}
          </div>
          <div className="border-t border-border/40 pt-3 flex justify-between items-center">
            <span className="text-xs text-muted-foreground font-mono">Total subscription MRR</span>
            <span className="text-xl font-bold text-green-400">$9,935/mo</span>
          </div>
          <p className="text-[11px] text-muted-foreground/60 leading-relaxed">
            Per-submission overages and growth add substantial upside beyond base MRR.
            At industry-average 10% MoM growth, this exceeds $20K/mo within 8 months.
          </p>
        </CardContent>
      </Card>

      {/* Compare to market */}
      <div className="max-w-2xl mx-auto text-center space-y-3">
        <h3 className="text-sm font-semibold font-mono uppercase tracking-wider text-muted-foreground">
          How We Compare
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-left">
          {[
            { name: "Codemagic (direct)", price: "$95–$299/mo", note: "Build automation only, no submission mgmt" },
            { name: "App Store Connect", price: "$99/yr Apple fee", note: "Manual process, no automation" },
            { name: "Agency submission", price: "$500–$2,000/app", note: "One-time, no ongoing pipeline" },
          ].map(c => (
            <div key={c.name} className="p-3 rounded-lg bg-muted/20 border border-border/40 space-y-1">
              <p className="text-xs font-semibold">{c.name}</p>
              <p className="text-sm font-bold text-muted-foreground">{c.price}</p>
              <p className="text-[10px] text-muted-foreground/60">{c.note}</p>
            </div>
          ))}
        </div>
        <p className="text-xs text-muted-foreground/70 leading-relaxed max-w-lg mx-auto pt-2">
          POSTAPP combines build automation <em>and</em> submission management in one streamlined tool —
          at a price point well below assembling the equivalent workflow yourself.
          There is no direct competitor offering this exact combination.
        </p>
      </div>
    </div>
  );
}
