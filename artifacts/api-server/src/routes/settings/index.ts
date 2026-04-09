import { Router } from "express";
import { db } from "@workspace/db";
import { buildSettingsTable, wrapConfigsTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";

const router = Router();

// GET /api/settings — get current settings (masked)
router.get("/settings", async (_req, res) => {
  try {
    const rows = await db.select().from(buildSettingsTable);
    if (!rows.length) {
      res.json({ exists: false });
      return;
    }
    const s = rows[0];
    res.json({
      exists: true,
      hasCodemagicApiKey: !!s.codemagicApiKey,
      hasGithubToken: !!s.githubToken,
      hasAppStoreKey: !!s.appStoreKeyId && !!s.appStoreIssuerId && !!s.appStorePrivateKey,
      appStoreKeyId: s.appStoreKeyId || "",
      appStoreIssuerId: s.appStoreIssuerId || "",
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to load settings" });
  }
});

// POST /api/settings — save settings
router.post("/settings", async (req, res) => {
  try {
    const {
      codemagicApiKey,
      githubToken,
      appStoreKeyId,
      appStoreIssuerId,
      appStorePrivateKey,
    } = req.body;

    const rows = await db.select().from(buildSettingsTable);

    if (rows.length) {
      const update: Record<string, string> = {};
      if (codemagicApiKey !== undefined) update.codemagicApiKey = codemagicApiKey;
      if (githubToken !== undefined) update.githubToken = githubToken;
      if (appStoreKeyId !== undefined) update.appStoreKeyId = appStoreKeyId;
      if (appStoreIssuerId !== undefined) update.appStoreIssuerId = appStoreIssuerId;
      if (appStorePrivateKey !== undefined) update.appStorePrivateKey = appStorePrivateKey;
      await db.update(buildSettingsTable).set(update);
    } else {
      await db.insert(buildSettingsTable).values({
        codemagicApiKey: codemagicApiKey || null,
        githubToken: githubToken || null,
        appStoreKeyId: appStoreKeyId || null,
        appStoreIssuerId: appStoreIssuerId || null,
        appStorePrivateKey: appStorePrivateKey || null,
      });
    }

    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to save settings" });
  }
});

// POST /api/settings/validate — live-test each stored credential
router.post("/settings/validate", async (_req, res) => {
  try {
    const rows = await db.select().from(buildSettingsTable);
    const s = rows[0] || {};

    const results: Record<string, { ok: boolean; message: string }> = {
      codemagic: { ok: false, message: "Not configured" },
      github: { ok: false, message: "Not configured" },
      appStore: { ok: false, message: "Not configured" },
    };

    // Validate Codemagic API key
    if (s.codemagicApiKey) {
      try {
        const r = await fetch("https://api.codemagic.io/user", {
          headers: { "x-auth-token": s.codemagicApiKey },
        });
        if (r.ok) {
          const data = await r.json() as { user?: { email?: string } };
          results.codemagic = { ok: true, message: data?.user?.email ? `Connected as ${data.user.email}` : "Connected" };
        } else {
          results.codemagic = { ok: false, message: "Invalid key — check and re-enter" };
        }
      } catch {
        results.codemagic = { ok: false, message: "Connection failed" };
      }
    }

    // Validate GitHub token
    if (s.githubToken) {
      try {
        const r = await fetch("https://api.github.com/user", {
          headers: { Authorization: `Bearer ${s.githubToken}`, "User-Agent": "POSTAPP/1.0" },
        });
        if (r.ok) {
          const data = await r.json() as { login?: string };
          results.github = { ok: true, message: data?.login ? `Connected as @${data.login}` : "Connected" };
        } else {
          results.github = { ok: false, message: "Invalid token — check and re-enter" };
        }
      } catch {
        results.github = { ok: false, message: "Connection failed" };
      }
    }

    // Validate App Store Connect credentials
    if (s.appStoreKeyId && s.appStoreIssuerId && s.appStorePrivateKey) {
      try {
        const { SignJWT, importPKCS8 } = await import("jose");
        const privateKey = await importPKCS8(s.appStorePrivateKey, "ES256");
        const token = await new SignJWT({})
          .setProtectedHeader({ alg: "ES256", kid: s.appStoreKeyId, typ: "JWT" })
          .setIssuer(s.appStoreIssuerId)
          .setAudience("appstoreconnect-v1")
          .setIssuedAt()
          .setExpirationTime("5m")
          .sign(privateKey);

        const r = await fetch("https://api.appstoreconnect.apple.com/v1/apps?limit=1", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (r.ok) {
          const data = await r.json() as { data?: unknown[] };
          const count = data?.data?.length ?? 0;
          results.appStore = { ok: true, message: `Connected — ${count} app${count !== 1 ? "s" : ""} visible` };
        } else if (r.status === 401) {
          results.appStore = { ok: false, message: "Invalid credentials — check Key ID, Issuer ID, and .p8 file" };
        } else {
          results.appStore = { ok: false, message: `API error ${r.status}` };
        }
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        results.appStore = { ok: false, message: msg.includes("PEM") ? "Invalid .p8 file format" : "Validation failed" };
      }
    }

    res.json(results);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Validation failed" });
  }
});

// POST /api/settings/provision-codemagic/:appId
// Auto-creates a Codemagic app from the GitHub repo stored in wrap_configs
router.post("/settings/provision-codemagic/:appId", async (req, res) => {
  try {
    const appId = parseInt(req.params.appId, 10);

    const rows = await db.select().from(buildSettingsTable);
    if (!rows.length || !rows[0].codemagicApiKey) {
      res.status(400).json({ error: "Codemagic API key not configured in Settings" });
      return;
    }
    const { codemagicApiKey, githubToken } = rows[0];

    const configs = await db.select().from(wrapConfigsTable).where(eq(wrapConfigsTable.appId, appId));
    if (!configs.length) {
      res.status(404).json({ error: "No wrap config found for this app" });
      return;
    }
    const cfg = configs[0];

    if (!cfg.githubRepoFullName) {
      res.status(400).json({ error: "GitHub repo not configured. Set it in the Wrap tab first." });
      return;
    }

    // If already provisioned, return existing ID
    if (cfg.codemagicAppId) {
      res.json({ codemagicAppId: cfg.codemagicAppId, alreadyExisted: true });
      return;
    }

    // Get GitHub repo URL
    const repoRes = await fetch(`https://api.github.com/repos/${cfg.githubRepoFullName}`, {
      headers: {
        Authorization: `Bearer ${githubToken}`,
        "User-Agent": "POSTAPP/1.0",
      },
    });
    if (!repoRes.ok) {
      res.status(400).json({ error: `GitHub repo not found: ${cfg.githubRepoFullName}` });
      return;
    }
    const repoData = await repoRes.json() as { html_url?: string; clone_url?: string };
    const repoUrl = repoData.clone_url || `https://github.com/${cfg.githubRepoFullName}.git`;

    // Create app in Codemagic
    const createRes = await fetch("https://api.codemagic.io/apps", {
      method: "POST",
      headers: {
        "x-auth-token": codemagicApiKey!,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ repositoryUrl: repoUrl }),
    });

    if (!createRes.ok) {
      const err = await createRes.json() as { message?: string };
      res.status(500).json({ error: `Codemagic provisioning failed: ${err.message || createRes.status}` });
      return;
    }

    const appData = await createRes.json() as { application?: { _id?: string; id?: string } };
    const codemagicAppId = appData?.application?._id || appData?.application?.id || "";

    if (!codemagicAppId) {
      res.status(500).json({ error: "Codemagic returned no app ID" });
      return;
    }

    // Store in DB
    await db.update(wrapConfigsTable)
      .set({ codemagicAppId })
      .where(eq(wrapConfigsTable.appId, appId));

    res.json({ codemagicAppId, alreadyExisted: false });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Provisioning failed" });
  }
});

export default router;
