import { Router } from "express";
import { db } from "@workspace/db";
import { buildSettingsTable } from "@workspace/db/schema";

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

export default router;
