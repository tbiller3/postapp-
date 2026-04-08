import { useSubmissionStore, PricingModel } from "@/state/submission-store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DollarSign } from "lucide-react";

const MODEL_LABELS: Record<PricingModel, string> = {
  free: "Free",
  freemium: "Freemium (free + IAP/subscription)",
  paid: "Paid up-front",
  subscription: "Subscription only",
};

export function PricingEditor() {
  const { data, setPricingField } = useSubmissionStore();
  const p = data.pricing;

  const needsTier = p.model === "paid" || p.model === "subscription";
  const needsTerms = p.subscription || p.model === "subscription";

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-3 border-b border-border/60">
        <CardTitle className="text-xs font-mono uppercase tracking-wider flex items-center gap-2 text-muted-foreground">
          <DollarSign className="h-3.5 w-3.5" />
          Pricing & Monetization
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-4 space-y-5">
        <div className="space-y-2">
          <Label className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
            Pricing Model
          </Label>
          <Select
            value={p.model}
            onValueChange={(v) => setPricingField("model", v as PricingModel)}
          >
            <SelectTrigger className="font-mono text-sm bg-background/50">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(MODEL_LABELS) as PricingModel[]).map((m) => (
                <SelectItem key={m} value={m} className="font-mono text-sm">
                  {MODEL_LABELS[m]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {needsTier && (
          <div className="space-y-2">
            <Label className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
              Price Tier
            </Label>
            <Input
              value={p.priceTier}
              placeholder="e.g. Tier 1 ($0.99) or Tier 5 ($4.99)"
              onChange={(e) => setPricingField("priceTier", e.target.value)}
              className="font-mono text-sm bg-background/50"
            />
          </div>
        )}

        <div className="space-y-3 border border-border/40 rounded-lg p-3 bg-muted/10">
          <p className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground mb-1">
            Monetization Features
          </p>
          {[
            { key: "hasIAP" as const, label: "Includes in-app purchases" },
            { key: "subscription" as const, label: "Uses subscriptions" },
            { key: "trialOffered" as const, label: "Free trial offered" },
          ].map(({ key, label }) => (
            <div key={key} className="flex items-center gap-3">
              <Checkbox
                id={`pricing-${key}`}
                checked={p[key] as boolean}
                onCheckedChange={(v) => setPricingField(key, v as boolean)}
                className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
              />
              <label
                htmlFor={`pricing-${key}`}
                className="text-sm font-medium cursor-pointer"
              >
                {label}
              </label>
            </div>
          ))}
        </div>

        {needsTerms && (
          <div className="space-y-2">
            <Label className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
              Subscription Terms
            </Label>
            <Textarea
              value={p.terms}
              placeholder="Describe billing cycle, trial period, renewal terms, restore purchases, cancellation policy..."
              onChange={(e) => setPricingField("terms", e.target.value)}
              className="min-h-[90px] resize-none font-mono text-sm bg-background/50"
            />
            <p className="text-[11px] text-muted-foreground/60">
              Required by App Store guideline 3.1.1 — must appear in the app UI.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
