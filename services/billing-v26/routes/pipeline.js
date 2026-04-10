const express = require("express");
const { runPipeline } = require("../services/pipelineEngine");

const router = express.Router();

const defaultProject = {
  privacyPolicy: null,
  supportUrl: null,
  screenshots: [],
  description: "Short desc",
  isWebWrapper: true
};

router.post("/run", async (req, res) => {
  const project = Object.assign({}, defaultProject, req.body.project || {});
  const user = req.user;

  try {
    const result = await runPipeline({ project, user });
    res.status(result.ok ? 200 : 402).json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
