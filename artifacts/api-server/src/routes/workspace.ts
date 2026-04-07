import { Router, type IRouter } from "express";
import { readdir, readFile } from "fs/promises";
import { join } from "path";
import { db, appsTable } from "@workspace/db";

const router: IRouter = Router();

const WORKSPACE_ROOT = join(import.meta.dirname, "..", "..", "..");

router.get("/workspace-apps", async (req, res): Promise<void> => {
  try {
    const artifactsDir = join(WORKSPACE_ROOT, "artifacts");
    const entries = await readdir(artifactsDir, { withFileTypes: true });

    const discovered: Array<{
      slug: string;
      title: string;
      kind: string;
      previewPath: string;
    }> = [];

    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      const tomlPath = join(artifactsDir, entry.name, ".replit-artifact", "artifact.toml");
      try {
        const raw = await readFile(tomlPath, "utf-8");
        const titleMatch = raw.match(/^title\s*=\s*"(.+)"/m);
        const kindMatch = raw.match(/^kind\s*=\s*"(.+)"/m);
        const previewMatch = raw.match(/^previewPath\s*=\s*"(.+)"/m);

        if (titleMatch && kindMatch && previewMatch) {
          discovered.push({
            slug: entry.name,
            title: titleMatch[1],
            kind: kindMatch[1],
            previewPath: previewMatch[1],
          });
        }
      } catch {
        // Skip artifacts without a toml or unreadable ones
      }
    }

    // Check which are already imported (by bundle_id matching slug or name matching title)
    const existingApps = await db.select({ name: appsTable.name, bundleId: appsTable.bundleId }).from(appsTable);
    const importedSlugs = new Set(existingApps.map((a) => a.bundleId ?? "").filter(Boolean));
    const importedNames = new Set(existingApps.map((a) => a.name.toLowerCase()));

    const result = discovered.map((d) => ({
      ...d,
      alreadyImported: importedSlugs.has(d.slug) || importedNames.has(d.title.toLowerCase()),
    }));

    res.json(result);
  } catch (err) {
    req.log.error({ err }, "Failed to list workspace apps");
    res.status(500).json({ error: "Failed to read workspace" });
  }
});

export default router;
