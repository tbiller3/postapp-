import { useEffect, useState } from "react";
import { Check, Zap, Loader2, Star, ArrowRight, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

interface Price {
  id: string;
  unit_amount: number;
  currency: string;
  recurring: any;
}

interface StripePlan {
  id: string;
  name: string;
  description: string;
  metadata: Record<string, string>;
  prices: Price[];
}

const PLANS = [
  {
    key: "free",
    name: "Free",
    price: "$0",
    priceNote: "forever",
    description: "See the value before you pay.",
    color: { card: "border-border/40 from-muted/10", badge: "text-slate-400 bg-slate-500/10 border-slate-500/20", button: "border border-border hover:bg-muted/30 text-foreground" },
    popular: false,
    features: [
      "1 project",
      "Analyzer preview",
      "Top-level readiness score",
      "View blockers",
      "Checklist access",
    ],
    cta: "Get Started Free",
    submissionFee: null,
  },
  {
    key: "solo",
    name: "Solo",
    price: "$39",
    priceNote: "/month",
    description: "Indie builders and first-time publishers.",
    color: { card: "border-sky-500/20 from-sky-950/30", badge: "text-sky-400 bg-sky-500/10 border-sky-500/20", button: "bg-sky-600 hover:bg-sky-500 text-white" },
    popular: false,
    features: [
      "1 active app pipeline",
      "Full V25 analyzer engine",
      "AI metadata auto-fill",
      "Guided fix flow",
      "Wizard + checklist",
      "Metadata workspace",
      "GitHub + Codemagic connect",
      "1 team member",
    ],
    cta: "Get Solo",
    submissionFee: "$149 per submission",
    matchNames: ["solo", "launch"],
  },
  {
    key: "builder",
    name: "Builder",
    price: "$79",
    priceNote: "/month",
    description: "Repeat creators, freelancers, small studios.",
    color: { card: "border-violet-500/40 from-violet-950/40", badge: "text-violet-400 bg-violet-500/10 border-violet-500/20", button: "bg-violet-600 hover:bg-violet-500 text-white" },
    popular: true,
    features: [
      "Up to 5 active pipelines",
      "Everything in Solo",
      "One-click Auto-Submit pipeline",
      "Priority build queue",
      "Saved metadata templates",
      "Reusable metadata blocks",
      "3 team members",
    ],
    cta: "Get Builder",
    submissionFee: "$99 per submission",
    matchNames: ["builder"],
  },
  {
    key: "studio",
    name: "Studio",
    price: "$199",
    priceNote: "/month",
    description: "Agencies, product studios, serious vibe coders.",
    color: { card: "border-amber-500/20 from-amber-950/30", badge: "text-amber-400 bg-amber-500/10 border-amber-500/20", button: "bg-amber-600 hover:bg-amber-500 text-white" },
    popular: false,
    features: [
      "Unlimited active pipelines",
      "Everything in Builder",
      "Team workspace",
      "Priority support",
      "Client / project separation",
      "White-label reporting",
      "5 team members",
    ],
    cta: "Get Studio",
    submissionFee: "$59 per submission",
    matchNames: ["studio"],
  },
];

const ADD_ONS = [
  { label: "Rejection / Resubmission Support", price: "$99" },
  { label: "Complex App Handling", price: "$149–$299" },
  { label: "Screenshot Pack Generation", price: "$49" },
  { label: "Metadata Optimization Pack", price: "$79" },
  { label: "Review-Response Drafting", price: "$29" },
];

export default function PricingPage() {
  const [stripePlans, setStripePlans] = useState<StripePlan[]>([]);
  const [checkingOut, setCheckingOut] = useState<string | null>(null);
  const { toast } = useToast();
  const BASE = (import.meta.env.BASE_URL || "/").replace(/\/$/, "");

  const success = new URLSearchParams(window.location.search).get("success");
  const canceled = new URLSearchParams(window.location.search).get("canceled");

  useEffect(() => {
    if (success) toast({ title: "Subscription activated!", description: "Welcome aboard. Your plan is now active." });
    if (canceled) toast({ title: "Checkout canceled", description: "No charge was made." });
  }, []);

  useEffect(() => {
    fetch(`${BASE}/api/stripe/plans`)
      .then(r => r.json())
      .then(d => setStripePlans(d.data || []))
      .catch(() => {});
  }, []);

  function findStripePrice(matchNames: string[]): string | null {
    for (const sp of stripePlans) {
      const nameL = sp.name.toLowerCase();
      if (matchNames.some(n => nameL.includes(n))) {
        const monthly = sp.prices.find(p => p.recurring?.interval === "month");
        if (monthly) return monthly.id;
      }
    }
    return null;
  }

  async function handleCheckout(planKey: string, matchNames?: string[]) {
    if (!matchNames) return;
    const priceId = findStripePrice(matchNames);
    if (!priceId) {
      toast({ title: "Plan not available", description: "Contact us to get started.", variant: "destructive" });
      return;
    }
    setCheckingOut(planKey);
    try {
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
    <div className="space-y-12 max-w-5xl mx-auto">
      {/* Header */}
      <div className="text-center space-y-3 max-w-2xl mx-auto">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-400 text-xs font-mono mb-2">
          <Zap className="h-3 w-3" />
          POSTAPP Pricing
        </div>
        <h1 className="text-3xl font-bold tracking-tight">
          From prototype to App Store — without the usual chaos
        </h1>
        <p className="text-muted-foreground text-sm leading-relaxed">
          Choose a plan for platform access, then pay only when you're ready to push an app through the real submission workflow.
        </p>
      </div>

      {/* Plan cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
        {PLANS.map(plan => (
          <div key={plan.key} className="relative">
            {plan.popular && (
              <div className="absolute -top-3 left-0 right-0 flex justify-center z-10">
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-violet-600 text-white text-[10px] font-bold uppercase tracking-wider shadow-lg">
                  <Star className="h-3 w-3" />
                  Most Popular
                </span>
              </div>
            )}
            <Card className={`h-full bg-gradient-to-b ${plan.color.card} to-card border flex flex-col ${plan.popular ? "ring-1 ring-violet-500/30 shadow-lg shadow-violet-900/20" : ""}`}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between gap-2">
                  <CardTitle className="text-sm font-semibold">{plan.name}</CardTitle>
                  <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border ${plan.color.badge}`}>
                    {plan.price}{plan.key !== "free" ? "/mo" : ""}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed mt-1">{plan.description}</p>
                <div className="pt-2">
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-bold">{plan.price}</span>
                    <span className="text-xs text-muted-foreground">{plan.priceNote}</span>
                  </div>
                  {plan.submissionFee && (
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      + {plan.submissionFee}
                    </p>
                  )}
                </div>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col gap-4 pt-0">
                <ul className="space-y-1.5 flex-1">
                  {plan.features.map(f => (
                    <li key={f} className="flex items-start gap-2 text-xs text-muted-foreground">
                      <Check className="h-3.5 w-3.5 text-green-500 shrink-0 mt-0.5" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Button
                  variant={plan.key === "free" ? "outline" : "default"}
                  size="sm"
                  className={`w-full text-xs font-semibold ${plan.color.button}`}
                  disabled={checkingOut === plan.key}
                  onClick={() => plan.matchNames ? handleCheckout(plan.key, plan.matchNames) : undefined}
                >
                  {checkingOut === plan.key
                    ? <><Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> Redirecting…</>
                    : <>{plan.cta} {plan.key !== "free" && <ArrowRight className="h-3.5 w-3.5 ml-1" />}</>
                  }
                </Button>
              </CardContent>
            </Card>
          </div>
        ))}
      </div>

      {/* Submission fee explainer */}
      <div className="flex items-start gap-3 p-4 rounded-xl bg-muted/20 border border-border/40 max-w-2xl mx-auto">
        <Shield className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="text-sm font-medium">Submission fees are charged only at the final stage</p>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Subscription gives you platform access, the analyzer, and the pipeline. The per-app submission fee applies
            only when you move into final App Store pipeline orchestration — build, sign, validate, and submit.
            If your app is rejected and POSTAPP cannot identify a path forward, we'll credit your submission fee.
          </p>
        </div>
      </div>

      {/* Add-ons */}
      <div className="space-y-4 max-w-2xl mx-auto">
        <h3 className="text-sm font-semibold font-mono uppercase tracking-wider text-muted-foreground text-center">
          Optional Add-ons
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {ADD_ONS.map(a => (
            <div key={a.label} className="flex items-center justify-between px-3 py-2.5 rounded-lg bg-muted/20 border border-border/40">
              <span className="text-xs text-muted-foreground">{a.label}</span>
              <span className="text-xs font-bold">{a.price}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Revenue proof */}
      <Card className="bg-muted/20 border-border/60 max-w-2xl mx-auto">
        <CardContent className="pt-5 space-y-4">
          <h3 className="text-sm font-semibold font-mono uppercase tracking-wider text-muted-foreground">
            Revenue Potential at Small Traction
          </h3>
          <div className="grid grid-cols-2 gap-4 text-center">
            {[
              { label: "100 Solo users", rev: "$4,900/mo", note: "$49 × 100" },
              { label: "40 submissions/mo", rev: "$7,960/mo", note: "$199 avg × 40" },
            ].map(r => (
              <div key={r.label} className="space-y-1">
                <p className="text-[10px] font-mono text-muted-foreground/60 uppercase">{r.label}</p>
                <p className="text-lg font-bold">{r.rev}</p>
                <p className="text-[10px] text-muted-foreground">{r.note}</p>
              </div>
            ))}
          </div>
          <div className="border-t border-border/40 pt-3 flex justify-between items-center">
            <span className="text-xs text-muted-foreground font-mono">Combined at this scale</span>
            <span className="text-xl font-bold text-green-400">$12,860/mo</span>
          </div>
          <p className="text-[11px] text-muted-foreground/60 leading-relaxed">
            Before Builder/Studio tiers and add-ons. Builder and Studio users bring higher MRR and higher avg submission fees.
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
        </p>
      </div>
    </div>
  );
}
