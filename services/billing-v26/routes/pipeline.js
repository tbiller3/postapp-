const express = require("express");
const { runOneClickPipeline } = require("../services/pipelineEngine");
const { runGate } = require("../services/gateEngine");

const router = express.Router();

// Demo in-memory project store
let mockPipelineProject = {
  id: "proj_123",
  name: "POSTAPP iOS Wrapper",
  privacyPolicy: null,
  supportUrl: null,
  screenshots: [],
  description: "Short desc",
  isWebWrapper: true
};

router.get("/project", (req, res) => {
  res.json({
    ok: true,
    project: mockPipelineProject
  });
});

router.post("/project", (req, res) => {
  mockPipelineProject = {
    ...mockPipelineProject,
    ...req.body
  };

  res.json({
    ok: true,
    project: mockPipelineProject
  });
});

router.post("/run", async (req, res) => {
  const result = await runOneClickPipeline(mockPipelineProject, {
    autoFix: true
  });

  mockPipelineProject = result.project;

  res.json({
    ok: true,
    pipeline: result
  });
});

router.post("/gate", async (req, res) => {
  try {
    const result = await runGate({
      project: mockPipelineProject,
      user: req.user,
      mockDb: req.app.locals.mockDb
    });

    mockPipelineProject = result.pipeline.project;

    res.json({ ok: true, ...result });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

module.exports = router;
