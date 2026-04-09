const express = require("express");
const { analyzeProject } = require("../services/analyzerEngine");
const { runFix } = require("../services/autoFixEngine");

const router = express.Router();

let mockProject = {
  privacyPolicy: null,
  supportUrl: null,
  screenshots: [],
  description: "Short desc",
  isWebWrapper: true
};

router.get("/analyze", (req, res) => {
  const result = analyzeProject(mockProject);
  res.json(result);
});

router.post("/fix", (req, res) => {
  const { fixType } = req.body;
  const message = runFix(fixType, mockProject);

  const result = analyzeProject(mockProject);

  res.json({
    message,
    updated: result
  });
});

module.exports = router;
