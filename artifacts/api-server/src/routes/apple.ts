import { Router, type IRouter } from "express";
import { generateAppleJWT, getAppleCredentialStatus } from "../lib/apple-jwt.js";

const router: IRouter = Router();
const ASC_BASE = "https://api.appstoreconnect.apple.com/v1";

async function ascFetch(path: string) {
  const token = generateAppleJWT();
  const res = await fetch(`${ASC_BASE}${path}`, {
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Apple Connect API error ${res.status}: ${text.slice(0, 300)}`);
  }
  return res.json();
}

router.get("/apple/status", (_req, res) => {
  const status = getAppleCredentialStatus();
  res.status(200).json({ status });
  return;
});

router.get("/apple/apps", async (_req, res) => {
  try {
    const data = await ascFetch("/apps?fields[apps]=name,bundleId,primaryLocale,sku&limit=50");
    res.status(200).json(data);
    return;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(502).json({ error: message });
    return;
  }
});

router.get("/apple/apps/:appleId/builds", async (req, res) => {
  const { appleId } = req.params as { appleId: string };
  try {
    const data = await ascFetch(
      `/builds?filter[app]=${appleId}&sort=-uploadedDate&limit=5&fields[builds]=version,processingState,uploadedDate`,
    );
    res.status(200).json(data);
    return;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(502).json({ error: message });
    return;
  }
});

router.get("/apple/apps/:appleId/versions", async (req, res) => {
  const { appleId } = req.params as { appleId: string };
  try {
    const data = await ascFetch(
      `/apps/${appleId}/appStoreVersions?fields[appStoreVersions]=versionString,platform,appStoreState,releaseType,createdDate&sort=-createdDate&limit=20`,
    );
    res.status(200).json(data);
    return;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(502).json({ error: message });
    return;
  }
});

router.get("/apple/apps/:appleId/localizations", async (req, res) => {
  const { appleId } = req.params as { appleId: string };
  try {
    const data = await ascFetch(
      `/apps/${appleId}/appInfos?include=appInfoLocalizations&fields[appInfoLocalizations]=locale,name,subtitle,description,keywords,supportUrl,marketingUrl,privacyPolicyUrl&limit=1`,
    );
    const localizations = (data.included ?? []).filter(
      (item: { type: string }) => item.type === "appInfoLocalizations",
    );
    res.status(200).json({ data: localizations });
    return;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(502).json({ error: message });
    return;
  }
});

export default router;

