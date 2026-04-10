const express = require("express");
const { runOneClickPipeline } = require("../services/pipelineEngine");

const router = express.Router();

let mockPipelineProject = {
  id: "proj_123",
  name: "POSTAPP Demo Project",
  metadata: {},
  screenshotMatrix: {},
  reviewer: {},
  signingPrep: {},
  buildState: {},
  appleState: {},
  uploadState: {},
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
      buildState: {},
      appleState: {},
      uploadState: {},
      timeline: []
    };
  }
}

router.get("/timeline", async (req, res) => {
  await ensureProjectLoaded();

  res.json({
    ok: true,
    timeline: mockPipelineProject.timeline || []
  });
});

router.get("/project", async (req, res) => {
  await ensureProjectLoaded();

  res.json({
    ok: true,
    project: mockPipelineProject
  });
});

router.post("/project", async (req, res) => {
  await ensureProjectLoaded();

  const previousReviewer = mockPipelineProject.reviewer || {};
  const previousMetadata = mockPipelineProject.metadata || {};
  const previousScreenshotMatrix = mockPipelineProject.screenshotMatrix || {};

  mockPipelineProject = {
    ...mockPipelineProject,
    ...req.body,
    reviewer: {
      ...previousReviewer,
      ...(req.body.reviewer || {})
    },
    metadata: {
      ...previousMetadata,
      ...(req.body.metadata || {})
    },
    screenshotMatrix: {
      ...previousScreenshotMatrix,
      ...(req.body.screenshotMatrix || {})
    }
  };

  addTimelineEvent(
    mockPipelineProject,
    "project_updated",
    "Project details updated",
    "info"
  );

  res.json({
    ok: true,
    project: mockPipelineProject
  });
});

router.post("/reviewer", async (req, res) => {
  await ensureProjectLoaded();

  mockPipelineProject.reviewer = {
    ...mockPipelineProject.reviewer,
    ...req.body
  };

  addTimelineEvent(
    mockPipelineProject,
    "reviewer_ready",
    "Reviewer credentials saved",
    "info"
  );

  res.json({
    ok: true,
    reviewer: mockPipelineProject.reviewer
  });
});

router.post("/metadata", async (req, res) => {
  await ensureProjectLoaded();

  mockPipelineProject.metadata = {
    ...mockPipelineProject.metadata,
    ...req.body
  };

  addTimelineEvent(
    mockPipelineProject,
    "metadata_update",
    "Metadata updated",
    "info"
  );

  res.json({
    ok: true,
    metadata: mockPipelineProject.metadata
  });
});

router.post("/screenshots", async (req, res) => {
  await ensureProjectLoaded();

  mockPipelineProject.screenshotMatrix = {
    ...mockPipelineProject.screenshotMatrix,
    ...req.body
  };

  addTimelineEvent(
    mockPipelineProject,
    "screenshots_updated",
    "Screenshot matrix updated",
    "info"
  );

  res.json({
    ok: true,
    screenshotMatrix: mockPipelineProject.screenshotMatrix
  });
});

router.get("/metadata-score", async (req, res) => {
  await ensureProjectLoaded();

  const metadata = mockPipelineProject.metadata || {};
  let score = 100;
  const issues = [];

  if (!metadata.appName) {
    score -= 20;
    issues.push("Missing app name");
  }
  if (!metadata.subtitle) {
    score -= 10;
    issues.push("Missing subtitle");
  }
  if (!metadata.keywords) {
    score -= 10;
    issues.push("Missing keywords");
  }
  if (!metadata.promoText) {
    score -= 5;
    issues.push("Missing promo text");
  }
  if (!metadata.description || metadata.description.length < 120) {
    score -= 20;
    issues.push("Description too short");
  }
  if (!metadata.supportUrl) {
    score -= 15;
    issues.push("Missing support URL");
  }
  if (!metadata.privacyPolicyUrl) {
    score -= 20;
    issues.push("Missing privacy policy URL");
  }

  const readiness =
    score >= 90 ? "Strong" :
    score >= 75 ? "Good" :
    score >= 55 ? "Needs Work" :
    "Weak";

  res.json({
    ok: true,
    score,
    readiness,
    issues
  });
});

router.get("/screenshot-score", async (req, res) => {
  await ensureProjectLoaded();

  const matrix = mockPipelineProject.screenshotMatrix || {};

  const requirements = {
    iphone69: 3,
    iphone65: 3,
    ipad13: 3,
    ipad129: 3
  };

  const statuses = {};
  let completeCount = 0;

  for (const key of Object.keys(requirements)) {
    const count = Array.isArray(matrix[key]) ? matrix[key].length : 0;

    if (count >= requirements[key]) {
      statuses[key] = "complete";
      completeCount++;
    } else if (count > 0) {
      statuses[key] = "partial";
    } else {
      statuses[key] = "missing";
    }
  }

  const score = Math.round((completeCount / Object.keys(requirements).length) * 100);

  res.json({
    ok: true,
    score,
    statuses
  });
});

router.post("/timeline", async (req, res) => {
  await ensureProjectLoaded();

  const { type, message, status = "info" } = req.body;

  addTimelineEvent(mockPipelineProject, type, message, status);

  res.json({
    ok: true,
    timeline: mockPipelineProject.timeline
  });
});

router.post("/run", async (req, res) => {
  await ensureProjectLoaded();

  addTimelineEvent(
    mockPipelineProject,
    "pipeline_start",
    "Pipeline execution started",
    "info"
  );

  const result = await runOneClickPipeline(mockPipelineProject, {
    autoFix: true
  });

  mockPipelineProject = result.project;

  addTimelineEvent(
    mockPipelineProject,
    "pipeline_complete",
    "Pipeline execution completed",
    result.ok ? "success" : "error"
  );

  res.json({
    ok: true,
    project: mockPipelineProject
  });
});

module.exports = router;
