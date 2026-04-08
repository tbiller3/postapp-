import { create } from "zustand";
import type { AppleApp, AppleBuild, AppleVersion, AppleConnectionStatus } from "@/types/apple";
import { useSubmissionStore } from "@/state/submission-store";

type AppleConnectStore = {
  status: AppleConnectionStatus;
  apps: AppleApp[];
  selectedAppId: string | null;
  versions: AppleVersion[];
  builds: AppleBuild[];
  error: string | null;
  isSyncing: boolean;

  checkStatus: () => Promise<void>;
  fetchApps: () => Promise<void>;
  selectApp: (appId: string) => void;
  fetchVersions: (appId: string) => Promise<void>;
  fetchBuilds: (appId: string) => Promise<void>;
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
  error: null,
  isSyncing: false,

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
    } catch (e) {
      set({ status: "error", error: e instanceof Error ? e.message : "Unknown error" });
    }
  },

  selectApp: (appId) => {
    set({ selectedAppId: appId, versions: [], builds: [] });
    get().fetchVersions(appId);
    get().fetchBuilds(appId);
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

  syncToSubmission: () => {
    const { apps, selectedAppId, builds } = get();
    const selectedApp = apps.find((a) => a.id === selectedAppId);
    if (!selectedApp) return;

    set({ isSyncing: true });

    const bundleId = selectedApp.attributes.bundleId;
    const latestBuild = builds[0]?.attributes.version ?? "";

    const { syncDetected, setField } = useSubmissionStore.getState();

    const current = useSubmissionStore.getState().detected;
    syncDetected({
      ...current,
      ...(bundleId ? { bundleId } : {}),
      ...(latestBuild ? { buildNumber: latestBuild } : {}),
    });

    if (bundleId) setField("bundleId", bundleId);
    if (latestBuild) setField("buildNumber", latestBuild);

    setTimeout(() => set({ isSyncing: false }), 1500);
  },

  reset: () => set({ apps: [], selectedAppId: null, versions: [], builds: [], error: null }),
}));
