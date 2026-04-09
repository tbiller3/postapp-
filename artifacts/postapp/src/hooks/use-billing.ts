import { useQuery } from "@tanstack/react-query";

export interface BillingStatus {
  plan: "free" | "solo" | "builder" | "studio";
  tier: number;
  submissionFee: number;
  maxPipelines: number;
  subscription: {
    id: string;
    status: string;
    currentPeriodEnd: string;
    cancelAtPeriodEnd: boolean;
    productName: string;
  } | null;
}

const FREE_STATUS: BillingStatus = {
  plan: "free",
  tier: 0,
  submissionFee: 19900,
  maxPipelines: 1,
  subscription: null,
};

export function useBilling() {
  const BASE = (import.meta.env.BASE_URL || "/").replace(/\/$/, "");
  const { data, isLoading, refetch } = useQuery<BillingStatus>({
    queryKey: ["billing-status"],
    queryFn: async () => {
      const res = await fetch(`${BASE}/api/billing/status`, { credentials: "include" });
      if (!res.ok) return FREE_STATUS;
      return res.json();
    },
    staleTime: 1000 * 60 * 5,
  });

  const status = data ?? FREE_STATUS;

  return {
    ...status,
    isLoading,
    refetch,
    isPaid: status.tier > 0,
    isSolo: status.plan === "solo",
    isBuilder: status.plan === "builder" || status.plan === "studio",
    isStudio: status.plan === "studio",
    canUseFull: status.tier > 0,
    submissionFeeDisplay: `$${(status.submissionFee / 100).toFixed(0)}`,
  };
}
