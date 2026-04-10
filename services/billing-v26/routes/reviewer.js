const express = require("express");

const router = express.Router();

let reviewerCredentials = {
  testEmail: "",
  testPassword: "",
  loginInstructions: "",
  demoNotes: "",
  featureExplanation: "",
  specialAccess: "",
  updatedAt: null
};

router.get("/", (req, res) => {
  res.json({ ok: true, reviewer: reviewerCredentials });
});

router.post("/", (req, res) => {
  reviewerCredentials = {
    ...reviewerCredentials,
    ...req.body,
    updatedAt: new Date().toISOString()
  };

  res.json({ ok: true, reviewer: reviewerCredentials });
});

module.exports = router;
