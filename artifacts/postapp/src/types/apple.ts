export interface AppleAppAttributes {
  name: string;
  bundleId: string;
  primaryLocale: string;
  sku: string;
  isOrEverWasMadeForKids: boolean;
}

export interface AppleApp {
  id: string;
  type: "apps";
  attributes: AppleAppAttributes;
}

export interface AppleVersionAttributes {
  versionString: string;
  platform: string;
  appStoreState: string;
  releaseType: string;
  createdDate: string;
}

export interface AppleVersion {
  id: string;
  type: "appStoreVersions";
  attributes: AppleVersionAttributes;
}

export type AppleConnectionStatus = "unconfigured" | "loading" | "connected" | "error";
