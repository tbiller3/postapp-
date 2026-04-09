import { Router, type IRouter } from "express";
import { eq, sql } from "drizzle-orm";
import { db, appsTable, checklistTable, revisionsTable, screenshotsTable } from "@workspace/db";
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

const IOS_SCREENSHOT_SLOTS = [
  { deviceType: "6.9-inch", label: "iPhone 16 Pro Max (6.9\")", requiredSize: "1320 × 2868 px" },
  { deviceType: "6.5-inch", label: "iPhone 14 Plus (6.5\")", requiredSize: "1284 × 2778 px" },
  { deviceType: "5.5-inch", label: "iPhone 8 Plus (5.5\")", requiredSize: "1242 × 2208 px" },
  { deviceType: "ipad-13", label: "iPad Pro 13\"", requiredSize: "2064 × 2752 px" },
  { deviceType: "ipad-11", label: "iPad Pro 11\"", requiredSize: "1668 × 2388 px" },
];

const ANDROID_SCREENSHOT_SLOTS = [
  { deviceType: "phone", label: "Android Phone", requiredSize: "1080 × 1920 px" },
  { deviceType: "tablet-7", label: "7-inch Tablet", requiredSize: "1200 × 1920 px" },
  { deviceType: "tablet-10", label: "10-inch Tablet", requiredSize: "1920 × 1200 px" },
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

  const progressRows = await db
    .select({
      appId: checklistTable.appId,
      total: sql<number>`count(*)::int`,
      done: sql<number>`count(*) filter (where ${checklistTable.completed})::int`,
    })
    .from(checklistTable)
    .groupBy(checklistTable.appId);

  const progressMap = new Map(progressRows.map((r) => [r.appId, { total: r.total, done: r.done }]));

  const result = apps.map((app) => ({
    ...app,
    checklistTotal: progressMap.get(app.id)?.total ?? 0,
    checklistDone: progressMap.get(app.id)?.done ?? 0,
  }));

  res.json(result);
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

  const platform = (parsed.data.platform ?? "iOS").toLowerCase();
  const slots = platform === "android" ? ANDROID_SCREENSHOT_SLOTS
    : platform === "both" ? [...IOS_SCREENSHOT_SLOTS, ...ANDROID_SCREENSHOT_SLOTS]
    : IOS_SCREENSHOT_SLOTS;

  await db.insert(screenshotsTable).values(
    slots.map((slot) => ({ appId: app.id, ...slot, status: "pending" }))
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

router.get("/apps/:id/screenshots", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid app ID" });
    return;
  }
  const items = await db
    .select()
    .from(screenshotsTable)
    .where(eq(screenshotsTable.appId, id));
  res.json(items);
});

router.patch("/screenshots/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid screenshot ID" });
    return;
  }
  const { status, notes } = req.body as { status?: string; notes?: string };
  const [item] = await db
    .update(screenshotsTable)
    .set({ ...(status !== undefined ? { status } : {}), ...(notes !== undefined ? { notes } : {}) })
    .where(eq(screenshotsTable.id, id))
    .returning();
  if (!item) {
    res.status(404).json({ error: "Screenshot slot not found" });
    return;
  }
  res.json(item);
});

export default router;
