import { Router, type IRouter } from "express";
import { eq, sql } from "drizzle-orm";
import { db, appsTable, checklistTable, revisionsTable } from "@workspace/db";
import {
  CreateAppBody,
  UpdateAppBody,
  GetAppParams,
  UpdateAppParams,
  DeleteAppParams,
  ListRevisionsParams,
  CreateRevisionParams,
  CreateRevisionBody,
  GetChecklistParams,
  UpdateChecklistItemParams,
  UpdateChecklistItemBody,
} from "@workspace/api-zod";

const router: IRouter = Router();

const APP_STORE_CHECKLIST = [
  { label: "App name follows App Store guidelines", category: "Metadata" },
  { label: "App description is accurate and complete", category: "Metadata" },
  { label: "Screenshots provided for all required device sizes", category: "Metadata" },
  { label: "App icon meets requirements (1024x1024 PNG, no alpha)", category: "Metadata" },
  { label: "Keywords are optimized and within 100 characters", category: "Metadata" },
  { label: "Privacy policy URL is valid and accessible", category: "Legal" },
  { label: "App does not collect data beyond what is declared", category: "Legal" },
  { label: "Age rating is accurate", category: "Legal" },
  { label: "In-app purchases are correctly configured", category: "Monetization" },
  { label: "Subscription terms and pricing are disclosed", category: "Monetization" },
  { label: "App does not crash on launch", category: "Technical" },
  { label: "App works on the minimum supported iOS/Android version", category: "Technical" },
  { label: "No references to competing platforms", category: "Technical" },
  { label: "All links and buttons are functional", category: "Technical" },
  { label: "Test account credentials provided (if required)", category: "Review" },
  { label: "Review notes explain any special features or flows", category: "Review" },
  { label: "Demo video provided (if app requires special setup)", category: "Review" },
];

router.get("/apps/summary", async (_req, res): Promise<void> => {
  const apps = await db.select().from(appsTable);
  const summary = {
    total: apps.length,
    draft: apps.filter((a) => a.status === "draft").length,
    inReview: apps.filter((a) => a.status === "in-review").length,
    needsRevision: apps.filter((a) => a.status === "needs-revision").length,
    readyForSubmission: apps.filter((a) => a.status === "ready-for-submission").length,
    approved: apps.filter((a) => a.status === "approved").length,
  };
  res.json(summary);
});

router.get("/apps", async (_req, res): Promise<void> => {
  const apps = await db.select().from(appsTable).orderBy(appsTable.createdAt);
  res.json(apps);
});

router.post("/apps", async (req, res): Promise<void> => {
  const parsed = CreateAppBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [app] = await db.insert(appsTable).values(parsed.data).returning();

  await db.insert(checklistTable).values(
    APP_STORE_CHECKLIST.map((item) => ({
      appId: app.id,
      label: item.label,
      category: item.category,
      completed: false,
    }))
  );

  res.status(201).json(app);
});

router.get("/apps/:id", async (req, res): Promise<void> => {
  const params = GetAppParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [app] = await db.select().from(appsTable).where(eq(appsTable.id, params.data.id));
  if (!app) {
    res.status(404).json({ error: "App not found" });
    return;
  }

  res.json(app);
});

router.patch("/apps/:id", async (req, res): Promise<void> => {
  const params = UpdateAppParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateAppBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [app] = await db
    .update(appsTable)
    .set(parsed.data)
    .where(eq(appsTable.id, params.data.id))
    .returning();

  if (!app) {
    res.status(404).json({ error: "App not found" });
    return;
  }

  res.json(app);
});

router.delete("/apps/:id", async (req, res): Promise<void> => {
  const params = DeleteAppParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [app] = await db.delete(appsTable).where(eq(appsTable.id, params.data.id)).returning();
  if (!app) {
    res.status(404).json({ error: "App not found" });
    return;
  }

  res.sendStatus(204);
});

router.get("/apps/:id/revisions", async (req, res): Promise<void> => {
  const params = ListRevisionsParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const revisions = await db
    .select()
    .from(revisionsTable)
    .where(eq(revisionsTable.appId, params.data.id))
    .orderBy(revisionsTable.createdAt);

  res.json(revisions);
});

router.post("/apps/:id/revisions", async (req, res): Promise<void> => {
  const params = CreateRevisionParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = CreateRevisionBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [revision] = await db
    .insert(revisionsTable)
    .values({ appId: params.data.id, ...parsed.data })
    .returning();

  res.status(201).json(revision);
});

router.patch("/revisions/:revisionId", async (req, res): Promise<void> => {
  const revisionId = parseInt(req.params.revisionId, 10);
  if (isNaN(revisionId)) {
    res.status(400).json({ error: "Invalid revision ID" });
    return;
  }
  const { resolved } = req.body as { resolved: boolean };
  if (typeof resolved !== "boolean") {
    res.status(400).json({ error: "resolved must be a boolean" });
    return;
  }
  const [revision] = await db
    .update(revisionsTable)
    .set({ resolved })
    .where(eq(revisionsTable.id, revisionId))
    .returning();
  if (!revision) {
    res.status(404).json({ error: "Revision not found" });
    return;
  }
  res.json(revision);
});

router.get("/apps/:id/checklist", async (req, res): Promise<void> => {
  const params = GetChecklistParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const items = await db
    .select()
    .from(checklistTable)
    .where(eq(checklistTable.appId, params.data.id));

  res.json(items);
});

router.patch("/checklist/:itemId", async (req, res): Promise<void> => {
  const params = UpdateChecklistItemParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateChecklistItemBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [item] = await db
    .update(checklistTable)
    .set(parsed.data)
    .where(eq(checklistTable.id, params.data.itemId))
    .returning();

  if (!item) {
    res.status(404).json({ error: "Checklist item not found" });
    return;
  }

  res.json(item);
});

export default router;
