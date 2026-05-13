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
// SCREENSHOT AUTOMATOR
// POST /api/apple/screenshots/upload
// Body JSON: { appleAppId, displayType, fileName, mimeType, imageBase64, versionId? }
// Handles the full Apple upload flow: screenshot set → reserve slot → PUT binary → commit
// ---------------------------------------------------------------------------

const DISPLAY_SIZES: Record<string, { w: number; h: number; label: string }> = {
  APP_IPHONE_67:          { w: 1290, h: 2796, label: "iPhone 15 Pro Max (6.7\")" },
  APP_IPHONE_65:          { w: 1242, h: 2688, label: "iPhone 11 Pro Max (6.5\")" },
  APP_IPHONE_55:          { w: 1242, h: 2208, label: "iPhone 8 Plus (5.5\")" },
  APP_IPAD_PRO_3GEN_129:  { w: 2048, h: 2732, label: "iPad Pro 12.9\" (3rd gen)" },
};

router.get("/apple/screenshot-display-types", (_req, res) => {
  res.json(DISPLAY_SIZES);
});

router.post("/apple/screenshots/upload", async (req, res) => {
  const { appleAppId, displayType, fileName, mimeType, imageBase64, versionId: providedVersionId } = req.body as {
    appleAppId: string;
    displayType: string;
    fileName: string;
    mimeType: string;
    imageBase64: string;
    versionId?: string;
  };

  if (!appleAppId || !displayType || !imageBase64 || !mimeType) {
    res.status(400).json({ error: "appleAppId, displayType, mimeType, and imageBase64 are required" });
    return;
  }

  try {
    // Step 1: Resolve version ID (PREPARE_FOR_SUBMISSION)
    let versionId = providedVersionId;
    if (!versionId) {
      const versionsData = await ascFetch(
        `/apps/${appleAppId}/appStoreVersions?filter[appStoreState]=PREPARE_FOR_SUBMISSION&filter[platform]=IOS&limit=1`,
      );
      if (!versionsData.data || versionsData.data.length === 0) {
        throw new Error("No open version slot found. Create a submission version first via the pipeline.");
      }
      versionId = versionsData.data[0].id as string;
    }

    // Step 2: Get or create en-US localization for this version
    const locsData = await ascFetch(
      `/appStoreVersions/${versionId}/appStoreVersionLocalizations?filter[locale]=en-US`,
    );
    let localizationId: string;
    if (locsData.data && locsData.data.length > 0) {
      localizationId = locsData.data[0].id as string;
    } else {
      const created = await ascPost("/appStoreVersionLocalizations", {
        data: {
          type: "appStoreVersionLocalizations",
          attributes: { locale: "en-US" },
          relationships: { appStoreVersion: { data: { type: "appStoreVersions", id: versionId } } },
        },
      });
      localizationId = created.data.id as string;
    }

    // Step 3: Get or create screenshot set for this display type
    const setsData = await ascFetch(
      `/appStoreVersionLocalizations/${localizationId}/appScreenshotSets?filter[screenshotDisplayType]=${displayType}`,
    );
    let screenshotSetId: string;
    if (setsData.data && setsData.data.length > 0) {
      screenshotSetId = setsData.data[0].id as string;
    } else {
      const created = await ascPost("/appScreenshotSets", {
        data: {
          type: "appScreenshotSets",
          attributes: { screenshotDisplayType: displayType },
          relationships: {
            appStoreVersionLocalization: { data: { type: "appStoreVersionLocalizations", id: localizationId } },
          },
        },
      });
      screenshotSetId = created.data.id as string;
    }

    // Step 4: Decode base64 → Buffer
    const imageBuffer = Buffer.from(imageBase64, "base64");
    const fileSize = imageBuffer.byteLength;
    const safeName = fileName || `screenshot-${displayType.toLowerCase()}.png`;

    // Step 5: Reserve upload slot
    const reserved = await ascPost("/appScreenshots", {
      data: {
        type: "appScreenshots",
        attributes: { fileName: safeName, fileSize },
        relationships: {
          appScreenshotSet: { data: { type: "appScreenshotSets", id: screenshotSetId } },
        },
      },
    });
    const screenshotId = reserved.data.id as string;
    const uploadOps = reserved.data.attributes.uploadOperations as Array<{
      method: string;
      url: string;
      length: number;
      offset: number;
      requestHeaders: Array<{ name: string; value: string }>;
    }>;

    // Step 6: Upload binary chunks to Apple's CDN
    for (const op of uploadOps) {
      const chunk = imageBuffer.slice(op.offset, op.offset + op.length);
      const headers: Record<string, string> = {};
      for (const h of op.requestHeaders) headers[h.name] = h.value;
      const uploadRes = await fetch(op.url, {
        method: op.method,
        headers,
        body: chunk,
      });
      if (!uploadRes.ok) {
        const txt = await uploadRes.text();
        throw new Error(`CDN upload failed (${uploadRes.status}): ${txt.slice(0, 200)}`);
      }
    }

    // Step 7: Commit upload
    await ascPatch(`/appScreenshots/${screenshotId}`, {
      data: {
        type: "appScreenshots",
        id: screenshotId,
        attributes: { uploaded: true, sourceFileChecksum: null },
      },
    });

    res.json({ ok: true, screenshotId, displayType, size: fileSize });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: message });
  }
});

// ---------------------------------------------------------------------------
// LIVE REVIEW STATUS — GET /api/apple/apps/:appleAppId/review-status
// Returns current version state + rejection reason if REJECTED
// ---------------------------------------------------------------------------
router.get("/apple/apps/:appleAppId/review-status", async (req, res) => {
  const { appleAppId } = req.params as { appleAppId: string };
  try {
    // Get latest version
    const versionsData = await ascFetch(
      `/apps/${appleAppId}/appStoreVersions?sort=-createdDate&limit=1&fields[appStoreVersions]=versionString,appStoreState,createdDate,releaseType`,
    );
    if (!versionsData.data || versionsData.data.length === 0) {
      res.json({ state: "UNKNOWN", versionString: null, rejectionReasons: [] });
      return;
    }

    const version = versionsData.data[0];
    const versionId = version.id as string;
    const state = version.attributes.appStoreState as string;
    const versionString = version.attributes.versionString as string;

    let rejectionReasons: string[] = [];

    if (state === "REJECTED" || state === "METADATA_REJECTED") {
      try {
        const reviewDetail = await ascFetch(
          `/appStoreVersions/${versionId}/appStoreReviewDetail?fields[appStoreReviewDetails]=rejectionReasons,contactFirstName,contactLastName,contactPhone,contactEmail,demoAccountName,demoAccountRequired`,
        );
        if (reviewDetail.data?.attributes?.rejectionReasons) {
          rejectionReasons = reviewDetail.data.attributes.rejectionReasons as string[];
        }
      } catch {
        // Review details may not be available for all rejection states
      }
    }

    res.json({ state, versionString, versionId, rejectionReasons });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(502).json({ error: message });
  }
});

// ---------------------------------------------------------------------------
// REJECTION FIXER — POST /api/apple/apps/:appleAppId/rejection-fix
// GPT-4o analyzes rejection reasons and returns structured fix plan
// ---------------------------------------------------------------------------
router.post("/apple/apps/:appleAppId/rejection-fix", async (req, res) => {
  const { appleAppId } = req.params as { appleAppId: string };
  const { versionId, rejectionReasons, appName } = req.body as {
    versionId?: string;
    rejectionReasons?: string[];
    appName?: string;
  };

  const openaiKey = process.env.OPENAI_API_KEY;
  if (!openaiKey) {
    res.status(503).json({ error: "OpenAI not configured" });
    return;
  }

  // Fetch rejection reasons if not provided
  let reasons = rejectionReasons ?? [];
  let resolvedVersionId = versionId;

  if (reasons.length === 0 && appleAppId) {
    try {
      const versionsData = await ascFetch(
        `/apps/${appleAppId}/appStoreVersions?sort=-createdDate&limit=1`,
      );
      if (versionsData.data?.[0]) {
        resolvedVersionId = versionsData.data[0].id as string;
        const detail = await ascFetch(
          `/appStoreVersions/${resolvedVersionId}/appStoreReviewDetail`,
        );
        if (detail.data?.attributes?.rejectionReasons) {
          reasons = detail.data.attributes.rejectionReasons as string[];
        }
      }
    } catch {
      /* best-effort */
    }
  }

  if (reasons.length === 0) {
    res.status(400).json({ error: "No rejection reasons found. Please paste the rejection message from your email." });
    return;
  }

  try {
    const prompt = `You are an expert in Apple App Store Review Guidelines. An iOS app called "${appName ?? "this app"}" was rejected. Analyze the rejection reasons and provide a clear, actionable fix plan.

REJECTION REASONS FROM APPLE:
${reasons.map((r, i) => `${i + 1}. ${r}`).join("\n")}

Return ONLY valid JSON:
{
  "summary": "1-2 sentence plain-English explanation of why Apple rejected it",
  "severity": "minor" | "moderate" | "critical",
  "fixes": [
    {
      "title": "Short fix title",
      "guideline": "Apple guideline number if known, e.g. 4.0",
      "description": "What specifically needs to be changed",
      "howTo": "Step-by-step instructions to fix this",
      "canResubmitImmediately": true | false
    }
  ],
  "resubmitChecklist": ["thing to verify before resubmitting", ...],
  "estimatedTimeToFix": "e.g. 30 minutes, 2 days"
}`;

    const openaiRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${openaiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
        temperature: 0.3,
      }),
    });

    if (!openaiRes.ok) throw new Error(`OpenAI error: ${openaiRes.status}`);
    const openaiData = await openaiRes.json() as { choices: Array<{ message: { content: string } }> };
    const parsed = JSON.parse(openaiData.choices[0]?.message?.content ?? "{}") as Record<string, unknown>;
    res.json({ ok: true, analysis: parsed, reasons, versionId: resolvedVersionId });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: message });
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

