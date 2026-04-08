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

export interface AppleBuildAttributes {
  version: string;
  processingState: string;
  uploadedDate: string;
}

export interface AppleBuild {
  id: string;
  type: "builds";
  attributes: AppleBuildAttributes;
}

export interface AppleLocalizationAttributes {
  locale: string;
  name: string;
  subtitle: string | null;
  description: string | null;
  keywords: string | null;
  supportUrl: string | null;
  marketingUrl: string | null;
  privacyPolicyUrl: string | null;
}

export interface AppleLocalization {
  id: string;
  type: "appInfoLocalizations";
  attributes: AppleLocalizationAttributes;
}

export type AppleConnectionStatus = "unconfigured" | "loading" | "connected" | "error";
