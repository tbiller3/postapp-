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

async function ascPost(path: string, body: unknown) {
  const token = generateAppleJWT();
  const res = await fetch(`${ASC_BASE}${path}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Apple Connect API error ${res.status}: ${text.slice(0, 400)}`);
  }
  // 204 No Content is valid for some Apple endpoints
  if (res.status === 204) return {};
  return res.json();
}

async function ascPatch(path: string, body: unknown) {
  const token = generateAppleJWT();
  const res = await fetch(`${ASC_BASE}${path}`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Apple Connect API error ${res.status}: ${text.slice(0, 400)}`);
  }
  if (res.status === 204) return {};
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

// ---------------------------------------------------------------------------
// ONE-CLICK PIPELINE — SSE endpoint
// GET /api/apple/pipeline/:appleAppId/run?version=...&buildId=...&description=...etc
// Streams step-by-step progress as Server-Sent Events
// ---------------------------------------------------------------------------
router.get("/apple/pipeline/:appleAppId/run", async (req, res) => {
  const { appleAppId } = req.params as { appleAppId: string };
  const q = req.query as Record<string, string>;

  // SSE headers
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  const send = (step: string, status: "running" | "done" | "error" | "skipped", message: string, data?: unknown) => {
    res.write(`data: ${JSON.stringify({ step, status, message, data, ts: Date.now() })}\n\n`);
  };

  try {
    // ── STEP 1: Validate credentials ──────────────────────────────────────
    send("credentials", "running", "Verifying Apple credentials…");
    const credStatus = getAppleCredentialStatus();
    if (credStatus !== "connected") throw new Error("Apple credentials are not configured. Go to Settings → Apple Connect and add your API key.");
    send("credentials", "done", "Apple credentials verified ✓");

    // ── STEP 2: Resolve App Store version (find existing or create new) ───
    send("version", "running", "Locating App Store version slot…");
    let versionId: string;
    let versionString: string;

    const openVersions = await ascFetch(
      `/apps/${appleAppId}/appStoreVersions?filter[appStoreState]=PREPARE_FOR_SUBMISSION&filter[platform]=IOS&limit=1`,
    );

    if (openVersions.data && openVersions.data.length > 0) {
      versionId = openVersions.data[0].id as string;
      versionString = openVersions.data[0].attributes.versionString as string;
      send("version", "done", `Using existing version slot: ${versionString} ✓`);
    } else {
      // Need to create a new version
      const targetVersion = q.version || "1.0.0";
      const created = await ascPost("/appStoreVersions", {
        data: {
          type: "appStoreVersions",
          attributes: { platform: "IOS", versionString: targetVersion },
          relationships: { app: { data: { type: "apps", id: appleAppId } } },
        },
      });
      versionId = created.data.id as string;
      versionString = targetVersion;
      send("version", "done", `Created new version slot: ${versionString} ✓`);
    }

    // ── STEP 3: Push metadata to App Store Connect ────────────────────────
    send("metadata", "running", "Pushing metadata to App Store Connect…");

    const metaAttrs: Record<string, string | undefined> = {};
    if (q.description) metaAttrs.description = q.description;
    if (q.keywords)    metaAttrs.keywords = q.keywords;
    if (q.whatsNew)    metaAttrs.whatsNew = q.whatsNew;
    if (q.supportUrl)  metaAttrs.supportUrl = q.supportUrl;
    if (q.marketingUrl) metaAttrs.marketingUrl = q.marketingUrl;

    // Get existing en-US localization for this version
    const existingLocs = await ascFetch(
      `/appStoreVersions/${versionId}/appStoreVersionLocalizations?filter[locale]=en-US`,
    );

    if (existingLocs.data && existingLocs.data.length > 0) {
      const locId = existingLocs.data[0].id as string;
      await ascPatch(`/appStoreVersionLocalizations/${locId}`, {
        data: { type: "appStoreVersionLocalizations", id: locId, attributes: metaAttrs },
      });
    } else {
      await ascPost("/appStoreVersionLocalizations", {
        data: {
          type: "appStoreVersionLocalizations",
          attributes: { locale: "en-US", ...metaAttrs },
          relationships: {
            appStoreVersion: { data: { type: "appStoreVersions", id: versionId } },
          },
        },
      });
    }
    send("metadata", "done", `Metadata pushed — ${Object.keys(metaAttrs).length} fields synced ✓`);

    // ── STEP 4: Link build ────────────────────────────────────────────────
    if (q.buildId) {
      send("build", "running", "Linking build to this version…");
      await ascPatch(`/appStoreVersions/${versionId}/relationships/build`, {
        data: { type: "builds", id: q.buildId },
      });
      send("build", "done", "Build linked to version ✓");
    } else {
      // Try to auto-link the latest valid build
      send("build", "running", "Looking for latest processed build…");
      try {
        const buildsData = await ascFetch(
          `/builds?filter[app]=${appleAppId}&filter[processingState]=VALID&sort=-uploadedDate&limit=1`,
        );
        if (buildsData.data && buildsData.data.length > 0) {
          const latestBuildId = buildsData.data[0].id as string;
          const buildVer = buildsData.data[0].attributes.version as string;
          await ascPatch(`/appStoreVersions/${versionId}/relationships/build`, {
            data: { type: "builds", id: latestBuildId },
          });
          send("build", "done", `Auto-linked latest build (${buildVer}) ✓`);
        } else {
          send("build", "skipped", "No processed builds found — skipping build link");
        }
      } catch {
        send("build", "skipped", "Could not auto-link build — you can link manually after");
      }
    }

    // ── STEP 5: Submit for Review ─────────────────────────────────────────
    send("submit", "running", "Submitting to Apple for review…");
    await ascPost("/appStoreReviewSubmissions", {
      data: {
        type: "appStoreReviewSubmissions",
        attributes: {},
        relationships: {
          appStoreVersion: { data: { type: "appStoreVersions", id: versionId } },
        },
      },
    });
    send("submit", "done", "Submitted to Apple Review Queue 🚀");

    // ── DONE ──────────────────────────────────────────────────────────────
    send("complete", "done", `${versionString} is now in Apple's review queue. You'll hear back within 24–48 hours.`);

  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    send("error", "error", message);
  }

  res.end();
});

// ---------------------------------------------------------------------------
// AI AUTO-FILL — generate metadata from app name + URL using OpenAI
// POST /api/apple/ai-fill  body: { appName, appUrl, category, existingDescription }
// ---------------------------------------------------------------------------
router.post("/apple/ai-fill", async (req, res) => {
  const { appName, appUrl, category, existingDescription } = req.body as {
    appName?: string;
    appUrl?: string;
    category?: string;
    existingDescription?: string;
  };

  if (!appName) {
    res.status(400).json({ error: "appName is required" });
    return;
  }

  const openaiKey = process.env.OPENAI_API_KEY;
  if (!openaiKey) {
    res.status(503).json({ error: "OpenAI not configured" });
    return;
  }

  try {
    const prompt = `You are an expert App Store copywriter. Generate complete App Store metadata for this iOS app.

App Name: ${appName}
${appUrl ? `URL: ${appUrl}` : ""}
${category ? `Category: ${category}` : ""}
${existingDescription ? `Existing description (improve this): ${existingDescription}` : ""}

Return ONLY valid JSON with these exact keys:
{
  "subtitle": "30 chars max tagline",
  "description": "compelling 500-800 word App Store description",
  "keywords": "comma,separated,keywords,max,100,chars,total",
  "whatsNew": "2-3 sentences about this release for returning users"
}

Rules:
- subtitle: max 30 characters, punchy value proposition
- description: highlight benefits not features, no emoji spam, end with call to action
- keywords: no spaces around commas, no duplicates of the app name, use the full 100 chars
- whatsNew: friendly, specific, mention 2-3 improvements`;

    const openaiRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${openaiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
        temperature: 0.7,
      }),
    });

    if (!openaiRes.ok) {
      const text = await openaiRes.text();
      throw new Error(`OpenAI error: ${text.slice(0, 200)}`);
    }

    const openaiData = await openaiRes.json() as { choices: Array<{ message: { content: string } }> };
    const content = openaiData.choices[0]?.message?.content;
    if (!content) throw new Error("Empty response from AI");

    const parsed = JSON.parse(content) as Record<string, string>;
    res.json({ ok: true, fields: parsed });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: message });
  }
});

export default router;

