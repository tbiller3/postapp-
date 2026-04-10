const express = require("express");
const { runOneClickPipeline } = require("../services/pipelineEngine");

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
  const options = req.body.options || {};

  try {
    const result = await runOneClickPipeline(project, options);
    res.status(result.ok ? 200 : 422).json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
