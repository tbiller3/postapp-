import { create } from "zustand";
import type { AppleApp, AppleBuild, AppleLocalization, AppleVersion, AppleConnectionStatus } from "@/types/apple";
import { useSubmissionStore } from "@/state/submission-store";

type AppleConnectStore = {
  status: AppleConnectionStatus;
  apps: AppleApp[];
  selectedAppId: string | null;
  versions: AppleVersion[];
  builds: AppleBuild[];
  localizations: AppleLocalization[];
  error: string | null;
  isSyncing: boolean;
  autoMatchedAppId: string | null;

  checkStatus: () => Promise<void>;
  fetchApps: () => Promise<void>;
  selectApp: (appId: string) => void;
  fetchVersions: (appId: string) => Promise<void>;
  fetchBuilds: (appId: string) => Promise<void>;
  fetchLocalizations: (appId: string) => Promise<void>;
  tryAutoMatch: () => void;
  syncToSubmission: () => void;
  reset: () => void;
};

const BASE = "/api";

async function apiFetch<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`);
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(body?.error ?? `Request failed: ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export const useAppleConnectStore = create<AppleConnectStore>((set, get) => ({
  status: "loading",
  apps: [],
  selectedAppId: null,
  versions: [],
  builds: [],
  localizations: [],
  error: null,
  isSyncing: false,
  autoMatchedAppId: null,

  checkStatus: async () => {
    try {
      const { status } = await apiFetch<{ status: "configured" | "unconfigured" }>("/apple/status");
      set({ status: status === "configured" ? "connected" : "unconfigured", error: null });
      if (status === "configured" && get().apps.length === 0) {
        await get().fetchApps();
      }
    } catch (e) {
      set({ status: "error", error: e instanceof Error ? e.message : "Unknown error" });
    }
  },

  fetchApps: async () => {
    set({ status: "loading", error: null });
    try {
      const data = await apiFetch<{ data: AppleApp[] }>("/apple/apps");
      set({ apps: data.data ?? [], status: "connected" });
      get().tryAutoMatch();
    } catch (e) {
      set({ status: "error", error: e instanceof Error ? e.message : "Unknown error" });
    }
  },

  tryAutoMatch: () => {
    const { apps } = get();
    const { fields } = useSubmissionStore.getState();
    const localBundleId = fields.bundleId?.trim();
    if (!localBundleId) return;
    const match = apps.find((a) => a.attributes.bundleId === localBundleId);
    if (match) {
      set({ autoMatchedAppId: match.id });
      if (!get().selectedAppId) {
        get().selectApp(match.id);
      }
    }
  },

  selectApp: (appId) => {
    set({ selectedAppId: appId, versions: [], builds: [], localizations: [] });
    get().fetchVersions(appId);
    get().fetchBuilds(appId);
    get().fetchLocalizations(appId);
  },

  fetchVersions: async (appId) => {
    try {
      const data = await apiFetch<{ data: AppleVersion[] }>(`/apple/apps/${appId}/versions`);
      set({ versions: data.data ?? [] });
    } catch (e) {
      set({ error: e instanceof Error ? e.message : "Unknown error" });
    }
  },

  fetchBuilds: async (appId) => {
    try {
      const data = await apiFetch<{ data: AppleBuild[] }>(`/apple/apps/${appId}/builds`);
      set({ builds: data.data ?? [] });
    } catch (e) {
      set({ error: e instanceof Error ? e.message : "Unknown error" });
    }
  },

  fetchLocalizations: async (appId) => {
    try {
      const data = await apiFetch<{ data: AppleLocalization[] }>(`/apple/apps/${appId}/localizations`);
      set({ localizations: data.data ?? [] });
    } catch (e) {
      set({ error: e instanceof Error ? e.message : "Unknown error" });
    }
  },

  syncToSubmission: () => {
    const { apps, selectedAppId, builds, localizations } = get();
    const selectedApp = apps.find((a) => a.id === selectedAppId);
    if (!selectedApp) return;

    set({ isSyncing: true });

    const { syncDetected, setField, detected } = useSubmissionStore.getState();

    const attrs = selectedApp.attributes;
    const primaryLocale = attrs.primaryLocale ?? "en-US";
    const localization =
      localizations.find((l) => l.attributes.locale === primaryLocale) ??
      localizations[0];

    const appleData: Record<string, string> = {};

    if (attrs.bundleId) appleData.bundleId = attrs.bundleId;
    if (attrs.name) appleData.name = attrs.name;

    const latestBuild = builds[0]?.attributes.version;
    if (latestBuild) appleData.buildNumber = latestBuild;

    if (localization) {
      const la = localization.attributes;
      if (la.name) appleData.name = la.name;
      if (la.subtitle) appleData.subtitle = la.subtitle;
      if (la.description) appleData.description = la.description;
      if (la.keywords) appleData.keywords = la.keywords;
      if (la.supportUrl) appleData.supportUrl = la.supportUrl;
      if (la.privacyPolicyUrl) appleData.privacyPolicyUrl = la.privacyPolicyUrl;
    }

    syncDetected({ ...detected, ...appleData });

    for (const [key, value] of Object.entries(appleData)) {
      setField(key as keyof typeof detected, value);
    }

    setTimeout(() => set({ isSyncing: false }), 1800);
  },

  reset: () => set({
    apps: [],
    selectedAppId: null,
    versions: [],
    builds: [],
    localizations: [],
    error: null,
    autoMatchedAppId: null,
  }),
}));
