import { create } from "zustand";

export type PricingModel = "free" | "paid" | "freemium" | "subscription";
export type Plan = "free" | "pro" | "studio";

export type SubmissionFields = {
  appName: string;
  subtitle: string;
  bundleId: string;
  version: string;
  buildNumber: string;
  description: string;
  keywords: string;
  supportUrl: string;
  privacyPolicyUrl: string;
  category: string;
  ageRating: string;
};

export type DetectedData = Partial<SubmissionFields>;

export type PricingState = {
  model: PricingModel;
  priceTier: string;
  hasIAP: boolean;
  hasSubscriptions: boolean;
  freeTrial: boolean;
  notes: string;
};

type SubmissionStore = {
  plan: Plan;
  fields: SubmissionFields;
  detected: DetectedData;
  pricing: PricingState;

  setField: (key: keyof SubmissionFields, value: string) => void;
  setPricingField: <K extends keyof PricingState>(key: K, value: PricingState[K]) => void;
  syncDetected: (payload: DetectedData) => void;
  applyDetectedValue: (key: keyof SubmissionFields) => void;
  applyAllDetectedValues: () => void;
  loadDemoSubmission: () => void;
  seedFromApp: (app: Partial<DetectedData>) => void;
  reset: () => void;
  getCompletionStats: () => {
    complete: number;
    missing: number;
    total: number;
    percent: number;
  };
};

const emptyFields: SubmissionFields = {
  appName: "",
  subtitle: "",
  bundleId: "",
  version: "",
  buildNumber: "",
  description: "",
  keywords: "",
  supportUrl: "",
  privacyPolicyUrl: "",
  category: "",
  ageRating: "",
};

const defaultPricing: PricingState = {
  model: "free",
  priceTier: "",
  hasIAP: false,
  hasSubscriptions: false,
  freeTrial: false,
  notes: "",
};

export const useSubmissionStore = create<SubmissionStore>((set, get) => ({
  plan: "pro",
  fields: { ...emptyFields },
  detected: {},
  pricing: { ...defaultPricing },

  setField: (key, value) =>
    set((s) => ({ fields: { ...s.fields, [key]: value } })),

  setPricingField: (key, value) =>
    set((s) => ({ pricing: { ...s.pricing, [key]: value } })),

  syncDetected: (payload) =>
    set({ detected: payload }),

  applyDetectedValue: (key) =>
    set((s) => {
      const v = s.detected[key];
      if (!v) return s;
      return { fields: { ...s.fields, [key]: v } };
    }),

  applyAllDetectedValues: () =>
    set((s) => {
      const merged = { ...s.fields };
      (Object.keys(s.fields) as (keyof SubmissionFields)[]).forEach((k) => {
        const d = s.detected[k];
        if (d && d.trim()) merged[k] = d;
      });
      return { fields: merged };
    }),

  loadDemoSubmission: () =>
    set({
      fields: {
        appName: "Wait Wise",
        subtitle: "Pause Through Urges",
        bundleId: "",
        version: "1.0",
        buildNumber: "",
        category: "Health & Fitness",
        ageRating: "17+",
        keywords: "recovery,sobriety,addiction,urge,craving,pause,sober,relapse,mindful,calm,habit,breathe",
        supportUrl: "",
        privacyPolicyUrl: "",
        description:
          "Wait Wise helps you pause through cravings, urges, and compulsive moments before acting on them.\n\nWhen the urge hits, Wait Wise gives you structured pause techniques, guided breathing, grounding prompts, and urge tracking — so you can observe the moment without surrendering to it.\n\nFEATURES\n• Guided urge-surfing sessions\n• Calming breathing exercises\n• Craving journal with timestamps\n• Streak and milestone tracking\n• Progress dashboard\n• Private and offline-capable\n\nWAIT stands for: Why Am I Tempted?\n\nDesigned for anyone working through recovery from substance use, behavioral addiction, or compulsive habits. Intended to support — not replace — professional care.",
      },
      detected: {
        appName: "Wait Wise",
        subtitle: "Pause Through Urges",
        version: "1.0",
        category: "Health & Fitness",
        ageRating: "17+",
        keywords: "recovery,sobriety,addiction,urge,craving,pause,sober,relapse,mindful,calm,habit,breathe",
        description:
          "Wait Wise helps you pause through cravings, urges, and compulsive moments before acting on them.\n\nWhen the urge hits, Wait Wise gives you structured pause techniques, guided breathing, grounding prompts, and urge tracking — so you can observe the moment without surrendering to it.\n\nFEATURES\n• Guided urge-surfing sessions\n• Calming breathing exercises\n• Craving journal with timestamps\n• Streak and milestone tracking\n• Progress dashboard\n• Private and offline-capable\n\nWAIT stands for: Why Am I Tempted?\n\nDesigned for anyone working through recovery from substance use, behavioral addiction, or compulsive habits. Intended to support — not replace — professional care.",
      },
      pricing: { ...defaultPricing },
    }),

  seedFromApp: (app) =>
    set((s) => ({
      fields: {
        ...s.fields,
        ...(app.appName ? { appName: app.appName } : {}),
        ...(app.bundleId ? { bundleId: app.bundleId } : {}),
        ...(app.version ? { version: app.version } : {}),
        ...(app.description ? { description: app.description } : {}),
        ...(app.category ? { category: app.category } : {}),
        ...(app.keywords ? { keywords: app.keywords } : {}),
        ...(app.privacyPolicyUrl ? { privacyPolicyUrl: app.privacyPolicyUrl } : {}),
        ...(app.supportUrl ? { supportUrl: app.supportUrl } : {}),
        ...(app.ageRating ? { ageRating: app.ageRating } : {}),
      },
      detected: {
        ...(app.appName ? { appName: app.appName } : {}),
        ...(app.bundleId ? { bundleId: app.bundleId } : {}),
        ...(app.version ? { version: app.version } : {}),
        ...(app.description ? { description: app.description } : {}),
        ...(app.category ? { category: app.category } : {}),
      },
    })),

  reset: () =>
    set({ fields: { ...emptyFields }, detected: {}, pricing: { ...defaultPricing } }),

  getCompletionStats: () => {
    const { fields } = get();
    const keys = Object.keys(fields) as (keyof SubmissionFields)[];
    const complete = keys.filter((k) => String(fields[k]).trim()).length;
    const total = keys.length;
    return { complete, missing: total - complete, total, percent: Math.round((complete / total) * 100) };
  },
}));
