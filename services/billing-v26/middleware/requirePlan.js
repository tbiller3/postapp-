const { getEntitlements } = require("../services/billingService");

function requirePlan(featureKey) {
  return async (req, res, next) => {
    try {
      const user = req.user;

      if (!user) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const entitlements = getEntitlements(user.plan_name || "free");

      if (!entitlements[featureKey]) {
        return res.status(403).json({
          error: "upgrade_required",
          required_feature: featureKey,
          current_plan: user.plan_name || "free"
        });
      }

      req.entitlements = entitlements;
      next();
    } catch (err) {
      next(err);
    }
  };
}

module.exports = { requirePlan };
