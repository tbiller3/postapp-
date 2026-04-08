import { create } from "zustand";
import type { AppleApp, AppleVersion, AppleConnectionStatus } from "@/types/apple";

type AppleConnectStore = {
  status: AppleConnectionStatus;
  apps: AppleApp[];
  selectedAppId: string | null;
  versions: AppleVersion[];
  error: string | null;

  checkStatus: () => Promise<void>;
  fetchApps: () => Promise<void>;
  selectApp: (appId: string) => void;
  fetchVersions: (appId: string) => Promise<void>;
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
  error: null,

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
    set({ selectedAppId: appId, versions: [] });
    get().fetchVersions(appId);
  },

  fetchVersions: async (appId) => {
    try {
      const data = await apiFetch<{ data: AppleVersion[] }>(`/apple/apps/${appId}/versions`);
      set({ versions: data.data ?? [] });
    } catch (e) {
      set({ error: e instanceof Error ? e.message : "Unknown error" });
    }
  },

  reset: () => set({ apps: [], selectedAppId: null, versions: [], error: null }),
}));
