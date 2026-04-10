const express = require("express");

const router = express.Router();

const STAGES = [
  { key: "pipeline_completed",     label: "Pipeline Completed" },
  { key: "submission_started",     label: "Submission Started" },
  { key: "waiting_for_review",     label: "Waiting for Review" },
  { key: "in_review",              label: "In Review" },
  { key: "approved",               label: "Approved" },
  { key: "rejected",               label: "Rejected" },
  { key: "resubmission_needed",    label: "Resubmission Needed" }
];

let timeline = [];

router.get("/", (req, res) => {
  res.json({ ok: true, timeline, stages: STAGES });
});

router.post("/event", (req, res) => {
  const { key, label, note, status = "complete" } = req.body;

  const existing = timeline.findIndex((e) => e.key === key);

  const event = {
    key,
    label: label || STAGES.find((s) => s.key === key)?.label || key,
    status,
    note: note || null,
    timestamp: new Date().toISOString()
  };

  if (existing >= 0) {
    timeline[existing] = event;
  } else {
    timeline.push(event);
  }

  res.json({ ok: true, event, timeline });
});

router.post("/reset", (req, res) => {
  timeline = [];
  res.json({ ok: true, timeline });
});

module.exports = router;
