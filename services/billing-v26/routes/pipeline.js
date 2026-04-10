const express = require("express");
const { runOneClickPipeline } = require("../services/pipelineEngine");
const { evaluateSigning } = require("../services/signingService");
const { validateBuildConfig, initBuildState, triggerBuild, pollBuildStatus, listBuilds, isLive: isCodemagicLive } = require("../services/codemagicService");
const { validateAppleConfig, initAppleState, generateJwt, createApp, createVersion, getAppleStatus, lookupApp, isLive: isAppleLive } = require("../services/appleConnectService");
const { initUploadState, prepareUpload } = require("../services/uploadService");

const router = express.Router();

const defaultScreenshots = [
  "mission-control",
  "active-targets",
  "pipeline-settings",
  "new-submission",
  "checklist-complete",
  "pricing",
  "checklist-wrap",
  "checklist-screenshots"
];

let mockPipelineProject = {
  id: "proj_123",
  name: "POSTAPP Demo Project",
  metadata: {},
  screenshotMatrix: {
    iphone69: defaultScreenshots.slice(0, 4),
    iphone65: defaultScreenshots.slice(0, 4),
    ipad13: defaultScreenshots.slice(4, 8),
    ipad129: defaultScreenshots.slice(4, 8)
  },
  reviewer: {},
  signingPrep: {},
  buildState: initBuildState(),
  appleState: initAppleState(),
  uploadState: initUploadState(),
  timeline: []
};

function addTimelineEvent(project, type, message, status = "info") {
  const event = {
    id: "evt_" + Date.now(),
    type,
    message,
    status,
    timestamp: new Date().toISOString()
  };

  project.timeline.unshift(event);
  return event;
}

async function ensureProjectLoaded() {
  if (!mockPipelineProject) {
    mockPipelineProject = {
      id: "proj_123",
      name: "POSTAPP Demo Project",
      metadata: {},
      screenshotMatrix: {},
      reviewer: {},
      signingPrep: {},
      buildState: initBuildState(),
      appleState: initAppleState(),
      uploadState: initUploadState(),
      timeline: []
    };
  }
}

router.get("/project", async (req, res) => {
  await ensureProjectLoaded();
  res.json({ ok: true, project: mockPipelineProject });
});

router.post("/project", async (req, res) => {
  await ensureProjectLoaded();

  const prev = mockPipelineProject;
  mockPipelineProject = {
    ...prev,
    ...req.body,
    reviewer: { ...prev.reviewer, ...(req.body.reviewer || {}) },
    metadata: { ...prev.metadata, ...(req.body.metadata || {}) },
    screenshotMatrix: { ...prev.screenshotMatrix, ...(req.body.screenshotMatrix || {}) },
    signingPrep: { ...prev.signingPrep, ...(req.body.signingPrep || {}) },
    buildState: { ...prev.buildState, ...(req.body.buildState || {}) },
    appleState: { ...prev.appleState, ...(req.body.appleState || {}) },
    uploadState: { ...prev.uploadState, ...(req.body.uploadState || {}) },
    timeline: prev.timeline
  };

  addTimelineEvent(mockPipelineProject, "project_updated", "Project details updated");
  res.json({ ok: true, project: mockPipelineProject });
});

router.post("/reviewer", async (req, res) => {
  await ensureProjectLoaded();
  mockPipelineProject.reviewer = { ...mockPipelineProject.reviewer, ...req.body };
  addTimelineEvent(mockPipelineProject, "reviewer_ready", "Reviewer credentials saved");
  res.json({ ok: true, reviewer: mockPipelineProject.reviewer });
});

router.post("/metadata", async (req, res) => {
  await ensureProjectLoaded();
  mockPipelineProject.metadata = { ...mockPipelineProject.metadata, ...req.body };
  addTimelineEvent(mockPipelineProject, "metadata_update", "Metadata updated");
  res.json({ ok: true, metadata: mockPipelineProject.metadata });
});

router.get("/metadata-score", async (req, res) => {
  await ensureProjectLoaded();
  const m = mockPipelineProject.metadata || {};
  let score = 100;
  const issues = [];

  if (!m.appName) { score -= 20; issues.push("Missing app name"); }
  if (!m.subtitle) { score -= 10; issues.push("Missing subtitle"); }
  if (!m.keywords) { score -= 10; issues.push("Missing keywords"); }
  if (!m.promoText) { score -= 5; issues.push("Missing promo text"); }
  if (!m.description || m.description.length < 120) { score -= 20; issues.push("Description too short"); }
  if (!m.supportUrl) { score -= 15; issues.push("Missing support URL"); }
  if (!m.privacyPolicyUrl) { score -= 20; issues.push("Missing privacy policy URL"); }

  const readiness = score >= 90 ? "Strong" : score >= 75 ? "Good" : score >= 55 ? "Needs Work" : "Weak";
  res.json({ ok: true, score, readiness, issues });
});

router.get("/screenshots/files", async (req, res) => {
  const fs = require("fs");
  const path = require("path");
  const dir = path.join(__dirname, "../public/screenshots");
  try {
    const files = fs.readdirSync(dir).filter(f => /\.(png|jpg|jpeg)$/i.test(f));
    res.json({ ok: true, files: files.map(f => ({ name: f.replace(/\.[^.]+$/, ""), filename: f, url: "/screenshots/" + f })) });
  } catch (e) {
    res.json({ ok: true, files: [] });
  }
});

router.post("/screenshots", async (req, res) => {
  await ensureProjectLoaded();
  mockPipelineProject.screenshotMatrix = { ...mockPipelineProject.screenshotMatrix, ...req.body };
  addTimelineEvent(mockPipelineProject, "screenshots_updated", "Screenshot matrix updated");
  res.json({ ok: true, screenshotMatrix: mockPipelineProject.screenshotMatrix });
});

router.get("/screenshot-score", async (req, res) => {
  await ensureProjectLoaded();
  const matrix = mockPipelineProject.screenshotMatrix || {};
  const requirements = { iphone69: 3, iphone65: 3, ipad13: 3, ipad129: 3 };
  const statuses = {};
  let completeCount = 0;

  for (const key of Object.keys(requirements)) {
    const count = Array.isArray(matrix[key]) ? matrix[key].length : 0;
    if (count >= requirements[key]) { statuses[key] = "complete"; completeCount++; }
    else if (count > 0) { statuses[key] = "partial"; }
    else { statuses[key] = "missing"; }
  }

  const score = Math.round((completeCount / Object.keys(requirements).length) * 100);
  res.json({ ok: true, score, statuses });
});

router.post("/signing-prep", async (req, res) => {
  await ensureProjectLoaded();
  mockPipelineProject.signingPrep = { ...mockPipelineProject.signingPrep, ...req.body };
  addTimelineEvent(mockPipelineProject, "signing_updated", "Signing config updated");
  res.json({ ok: true, signingPrep: mockPipelineProject.signingPrep });
});

router.get("/signing-score", async (req, res) => {
  await ensureProjectLoaded();
  const result = evaluateSigning(mockPipelineProject.signingPrep || {});
  res.json({ ok: true, ...result });
});

router.get("/signing/evaluate", async (req, res) => {
  await ensureProjectLoaded();
  const result = evaluateSigning(mockPipelineProject.signingPrep || {});
  res.json({ ok: true, ...result });
});

router.post("/signing/update", async (req, res) => {
  await ensureProjectLoaded();
  mockPipelineProject.signingPrep = { ...mockPipelineProject.signingPrep, ...req.body };
  const result = evaluateSigning(mockPipelineProject.signingPrep);
  addTimelineEvent(mockPipelineProject, "signing_updated", `Signing updated — score ${result.score}`);
  res.json({ ok: true, signingPrep: mockPipelineProject.signingPrep, ...result });
});

router.get("/build-mode", async (req, res) => {
  res.json({ ok: true, live: isCodemagicLive(), message: isCodemagicLive() ? "Codemagic live mode" : "Mock mode — no CODEMAGIC_API_TOKEN" });
});

router.get("/build-config", async (req, res) => {
  await ensureProjectLoaded();
  res.json({ ok: true, config: mockPipelineProject.buildState.config || {}, live: isCodemagicLive() });
});

router.post("/build-config", async (req, res) => {
  await ensureProjectLoaded();
  mockPipelineProject.buildState.config = { ...mockPipelineProject.buildState.config, ...req.body };
  addTimelineEvent(mockPipelineProject, "build_config", "Build config updated");
  res.json({ ok: true, config: mockPipelineProject.buildState.config });
});

router.get("/build-config/validate", async (req, res) => {
  await ensureProjectLoaded();
  const result = validateBuildConfig(mockPipelineProject.buildState.config || {});
  res.json({ ok: true, ...result });
});

router.post("/build/start", async (req, res) => {
  await ensureProjectLoaded();
  const result = await triggerBuild(mockPipelineProject.buildState.config || {});
  if (!result.ok) {
    return res.status(400).json(result);
  }
  mockPipelineProject.buildState.buildId = result.buildId;
  mockPipelineProject.buildState.status = result.status;
  mockPipelineProject.buildState.startedAt = new Date().toISOString();
  addTimelineEvent(mockPipelineProject, "build_started", "Build started on Codemagic", "info");
  res.json({ ok: true, buildState: mockPipelineProject.buildState });
});

router.get("/build/status", async (req, res) => {
  await ensureProjectLoaded();
  if (!mockPipelineProject.buildState.buildId) {
    return res.json({ ok: true, status: "idle", message: "No build started", live: isCodemagicLive() });
  }
  const result = await pollBuildStatus(mockPipelineProject.buildState.buildId);
  if (result.ipaReady) {
    mockPipelineProject.buildState.ipaReady = true;
    mockPipelineProject.buildState.artifactUrl = result.artifactUrl;
    mockPipelineProject.buildState.finishedAt = result.finishedAt;
    mockPipelineProject.buildState.status = result.status;
    addTimelineEvent(mockPipelineProject, "build_complete", "Build finished — IPA ready", "success");
  } else {
    mockPipelineProject.buildState.status = result.status;
  }
  res.json({ ok: true, ...result });
});

router.get("/build/list", async (req, res) => {
  await ensureProjectLoaded();
  const appId = mockPipelineProject.buildState.config?.appId;
  if (!appId) {
    return res.status(400).json({ ok: false, error: "No app ID configured" });
  }
  const result = await listBuilds(appId);
  res.json(result);
});

router.get("/apple-mode", async (req, res) => {
  res.json({ ok: true, live: isAppleLive(), message: isAppleLive() ? "Apple Connect live mode" : "Mock mode — no Apple credentials" });
});

router.get("/apple-config", async (req, res) => {
  await ensureProjectLoaded();
  res.json({ ok: true, config: mockPipelineProject.appleState.config || {}, live: isAppleLive() });
});

router.post("/apple-config", async (req, res) => {
  await ensureProjectLoaded();
  mockPipelineProject.appleState.config = { ...mockPipelineProject.appleState.config, ...req.body };
  addTimelineEvent(mockPipelineProject, "apple_config", "Apple Connect config updated");
  res.json({ ok: true, config: mockPipelineProject.appleState.config });
});

router.get("/apple-config/validate", async (req, res) => {
  await ensureProjectLoaded();
  const result = validateAppleConfig(mockPipelineProject.appleState.config || {});
  res.json({ ok: true, ...result });
});

router.post("/apple/generate-jwt", async (req, res) => {
  await ensureProjectLoaded();
  const result = await generateJwt(mockPipelineProject.appleState.config || {});
  if (!result.ok) return res.status(400).json(result);
  mockPipelineProject.appleState.jwt = result.jwt;
  addTimelineEvent(mockPipelineProject, "apple_jwt", "Apple Connect JWT generated", "success");
  res.json({ ok: true, jwt: result.jwt, expiresIn: result.expiresIn });
});

router.post("/apple/create-app", async (req, res) => {
  await ensureProjectLoaded();
  const result = await createApp(mockPipelineProject.appleState.config || {});
  if (!result.ok) return res.status(400).json(result);
  mockPipelineProject.appleState.appExists = true;
  mockPipelineProject.appleState.appId = result.appId;
  addTimelineEvent(mockPipelineProject, "apple_app_created", "App record created in App Store Connect", "success");
  res.json({ ok: true, appId: result.appId });
});

router.get("/apple/lookup", async (req, res) => {
  await ensureProjectLoaded();
  const bundleId = req.query.bundleId || mockPipelineProject.appleState.config?.bundleId;
  if (!bundleId) return res.status(400).json({ ok: false, error: "No bundle ID" });
  const result = await lookupApp(bundleId);
  if (result.ok && result.found) {
    mockPipelineProject.appleState.appExists = true;
    mockPipelineProject.appleState.appId = result.appId;
    addTimelineEvent(mockPipelineProject, "apple_app_found", `Found existing app: ${result.name}`, "success");
  }
  res.json(result);
});

router.post("/apple/create-version", async (req, res) => {
  await ensureProjectLoaded();
  const version = req.body.versionString || mockPipelineProject.appleState.versionString || "1.0.0";
  const result = await createVersion(mockPipelineProject.appleState.appId, version);
  if (!result.ok) return res.status(400).json(result);
  mockPipelineProject.appleState.versionReady = true;
  mockPipelineProject.appleState.versionString = version;
  addTimelineEvent(mockPipelineProject, "apple_version_created", `Version ${version} created`, "success");
  res.json({ ok: true, versionId: result.versionId, versionString: version });
});

router.get("/apple/status", async (req, res) => {
  await ensureProjectLoaded();
  const result = await getAppleStatus(mockPipelineProject.appleState);
  res.json({ ok: true, ...result });
});

router.post("/upload/config", async (req, res) => {
  await ensureProjectLoaded();
  mockPipelineProject.uploadState = { ...mockPipelineProject.uploadState, ...req.body };
  addTimelineEvent(mockPipelineProject, "upload_config", "Upload config updated");
  res.json({ ok: true, uploadState: mockPipelineProject.uploadState });
});

router.post("/upload/prepare", async (req, res) => {
  await ensureProjectLoaded();
  try {
    const result = prepareUpload(mockPipelineProject);
    addTimelineEvent(mockPipelineProject, "upload_prepared", "Upload preparation complete");
    res.json(result);
  } catch (err) {
    res.status(400).json({ ok: false, error: err.message });
  }
});

router.post("/upload/start", async (req, res) => {
  await ensureProjectLoaded();
  mockPipelineProject.uploadState.status = "uploading";
  mockPipelineProject.uploadState.uploadId = "upl_" + Date.now();
  mockPipelineProject.uploadState.startedAt = new Date().toISOString();
  addTimelineEvent(mockPipelineProject, "upload_started", "Upload started", "info");
  res.json({ ok: true, uploadState: mockPipelineProject.uploadState });
});

router.get("/upload/status", async (req, res) => {
  await ensureProjectLoaded();
  res.json({ ok: true, uploadState: mockPipelineProject.uploadState });
});

router.get("/launch-dashboard", async (req, res) => {
  await ensureProjectLoaded();
  const p = mockPipelineProject;
  const m = p.metadata || {};
  const s = p.signingPrep || {};
  const b = p.buildState || {};
  const a = p.appleState || {};
  const u = p.uploadState || {};

  const metadataReady = !!(m.appName && m.description && m.privacyPolicyUrl && m.supportUrl);
  const screenshotsReady = Object.keys(p.screenshotMatrix || {}).length >= 4;
  const reviewerReady = !!(p.reviewer?.email && p.reviewer?.password);
  const signingResult = evaluateSigning(s);
  const buildReady = !!b.ipaReady;
  const appleReady = !!(a.appExists && a.versionReady && a.jwt);
  const uploadReady = u.status === "complete";

  const gates = {
    metadata: metadataReady,
    screenshots: screenshotsReady,
    reviewer: reviewerReady,
    signing: signingResult.ready,
    build: buildReady,
    apple: appleReady,
    upload: uploadReady
  };

  const allReady = Object.values(gates).every(Boolean);

  res.json({ ok: true, gates, allReady, signingScore: signingResult.score });
});

router.get("/launch/final-check", async (req, res) => {
  await ensureProjectLoaded();
  const p = mockPipelineProject;
  const blockers = [];

  if (!p.metadata?.appName) blockers.push("App name missing");
  if (!p.metadata?.privacyPolicyUrl) blockers.push("Privacy policy URL missing");
  if (!p.reviewer?.email) blockers.push("Reviewer email missing");
  if (!evaluateSigning(p.signingPrep || {}).ready) blockers.push("Signing not ready");
  if (!p.buildState?.ipaReady) blockers.push("IPA not built");
  if (!p.appleState?.appExists) blockers.push("Apple app not created");
  if (!p.appleState?.versionReady) blockers.push("Apple version not created");
  if (p.uploadState?.status !== "complete") blockers.push("Upload not complete");

  res.json({ ok: true, ready: blockers.length === 0, blockers });
});

router.post("/launch/submit", async (req, res) => {
  await ensureProjectLoaded();
  const p = mockPipelineProject;
  const blockers = [];

  if (!p.metadata?.appName) blockers.push("App name missing");
  if (!p.reviewer?.email) blockers.push("Reviewer email missing");
  if (!evaluateSigning(p.signingPrep || {}).ready) blockers.push("Signing not ready");
  if (!p.buildState?.ipaReady) blockers.push("IPA not built");
  if (!p.appleState?.appExists) blockers.push("Apple app not created");
  if (p.uploadState?.status !== "complete") blockers.push("Upload not complete");

  if (blockers.length > 0) {
    return res.status(400).json({ ok: false, blockers });
  }

  addTimelineEvent(mockPipelineProject, "launch_submitted", "App submitted for review", "success");
  res.json({ ok: true, message: "App submitted for App Store review" });
});

router.get("/timeline", async (req, res) => {
  await ensureProjectLoaded();
  res.json({ ok: true, timeline: mockPipelineProject.timeline || [] });
});

router.post("/timeline", async (req, res) => {
  await ensureProjectLoaded();
  const { type, message, status = "info" } = req.body;
  addTimelineEvent(mockPipelineProject, type, message, status);
  res.json({ ok: true, timeline: mockPipelineProject.timeline });
});

router.post("/run", async (req, res) => {
  await ensureProjectLoaded();
  addTimelineEvent(mockPipelineProject, "pipeline_start", "Pipeline execution started");

  const result = await runOneClickPipeline(mockPipelineProject, { autoFix: true });
  mockPipelineProject = result.project;

  addTimelineEvent(mockPipelineProject, "pipeline_complete", "Pipeline execution completed", result.ok ? "success" : "error");
  res.json({
    ok: true,
    pipeline: {
      ok: result.ok,
      stage: result.stage,
      analysis: result.analysis,
      steps: result.steps
    },
    project: mockPipelineProject
  });
});

module.exports = router;
