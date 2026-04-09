const express = require("express");
const {
  createSubscriptionCheckoutSession,
  createSubmissionCheckoutSession
} = require("../services/billingService");

const router = express.Router();

router.get("/status", async (req, res) => {
  const user = req.user;

  return res.json({
    ok: true,
    plan: user.plan_name || "free",
    stripe_customer_id: user.stripe_customer_id || null,
    subscription_status: user.subscription_status || "inactive"
  });
});

router.post("/create-checkout-session", async (req, res, next) => {
  try {
    const { planName } = req.body;
    const session = await createSubscriptionCheckoutSession({
      user: req.user,
      planName
    });

    res.json({ ok: true, url: session.url });
  } catch (err) {
    next(err);
  }
});

router.post("/create-submission-session", async (req, res, next) => {
  try {
    const { projectId, submissionType } = req.body;

    const session = await createSubmissionCheckoutSession({
      user: req.user,
      projectId,
      submissionType
    });

    res.json({ ok: true, url: session.url });
  } catch (err) {
    next(err);
  }
});

// Placeholder webhook handler
router.post("/webhook", async (req, res, next) => {
  try {
    console.log("Stripe webhook received:", req.body?.type || "unknown");
    res.json({ received: true });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
