import { create } from "zustand";

export type PricingModel = "free" | "paid" | "freemium" | "subscription";

export type SubmissionData = {
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
  pricing: {
    model: PricingModel;
    priceTier: string;
    hasIAP: boolean;
    subscription: boolean;
    trialOffered: boolean;
    terms: string;
  };
};

export type DetectedData = Partial<Omit<SubmissionData, "pricing">>;

type SubmissionStore = {
  data: SubmissionData;
  detected: DetectedData;
  setField: (key: keyof Omit<SubmissionData, "pricing">, value: string) => void;
  setDetected: (payload: DetectedData) => void;
  setPricingField: <K extends keyof SubmissionData["pricing"]>(
    key: K,
    value: SubmissionData["pricing"][K],
  ) => void;
  useDetectedValue: (key: keyof DetectedData) => void;
  seedFromApp: (app: Partial<DetectedData>) => void;
  reset: () => void;
};

const defaultData: SubmissionData = {
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
  pricing: {
    model: "free",
    priceTier: "",
    hasIAP: false,
    subscription: false,
    trialOffered: false,
    terms: "",
  },
};

export const useSubmissionStore = create<SubmissionStore>((set, get) => ({
  data: { ...defaultData },
  detected: {},

  setField: (key, value) =>
    set((state) => ({ data: { ...state.data, [key]: value } })),

  setDetected: (payload) => set({ detected: payload }),

  setPricingField: (key, value) =>
    set((state) => ({
      data: {
        ...state.data,
        pricing: { ...state.data.pricing, [key]: value },
      },
    })),

  useDetectedValue: (key) => {
    const val = get().detected[key];
    if (typeof val === "undefined") return;
    set((state) => ({ data: { ...state.data, [key]: val } }));
  },

  seedFromApp: (app) => {
    set((state) => ({
      data: {
        ...state.data,
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
    }));
  },

  reset: () => set({ data: { ...defaultData }, detected: {} }),
}));
