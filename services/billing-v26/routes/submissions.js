const express = require("express");
const { requirePlan } = require("../middleware/requirePlan");

const router = express.Router();

function hasUnusedSubmissionCredit(userId, projectId, db) {
  return db.submission_credits.find(
    (c) =>
      c.user_id === userId &&
      c.project_id === projectId &&
      c.status === "unused"
  );
}

router.get("/credit-status/:projectId", async (req, res) => {
  const db = req.app.locals.mockDb;
  const credit = hasUnusedSubmissionCredit(req.user.id, req.params.projectId, db);

  return res.json({
    ok: true,
    hasCredit: !!credit,
    credit: credit || null
  });
});

router.post("/start", requirePlan("submission_enabled"), async (req, res) => {
  const { projectId } = req.body;
  const db = req.app.locals.mockDb;

  const credit = hasUnusedSubmissionCredit(req.user.id, projectId, db);

  if (!credit) {
    return res.status(402).json({
      error: "submission_purchase_required",
      message: "A submission credit is required before final submission."
    });
  }

  return res.json({
    ok: true,
    message: "Submission workflow may begin.",
    creditId: credit.id
  });
});

router.post("/consume-credit", requirePlan("submission_enabled"), async (req, res) => {
  const { projectId } = req.body;
  const db = req.app.locals.mockDb;

  const credit = hasUnusedSubmissionCredit(req.user.id, projectId, db);

  if (!credit) {
    return res.status(404).json({ error: "No available submission credit." });
  }

  credit.status = "used";
  credit.used_at = new Date().toISOString();

  return res.json({
    ok: true,
    message: "Submission credit consumed.",
    credit
  });
});

router.post("/grant-dev-credit", async (req, res) => {
  const { projectId, type = "standard" } = req.body;
  const db = req.app.locals.mockDb;

  const credit = {
    id: `credit_${Date.now()}`,
    user_id: req.user.id,
    project_id: projectId,
    type,
    status: "unused",
    created_at: new Date().toISOString(),
    used_at: null
  };

  db.submission_credits.push(credit);

  res.json({
    ok: true,
    message: "Dev submission credit granted.",
    credit
  });
});

module.exports = router;
