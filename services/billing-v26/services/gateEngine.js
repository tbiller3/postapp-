const { runOneClickPipeline } = require("./pipelineEngine");
const { getEntitlements } = require("./billingService");

async function runGate({ project, user, mockDb }) {
  // Stage 1: Run the full pipeline (analyze + auto-fix)
  const pipeline = await runOneClickPipeline(project, { autoFix: true });

  // Stage 2: Pipeline blocker check
  if (!pipeline.ok) {
    return {
      gate: "blocked",
      reason: "pipeline_blockers",
      pipeline,
      billing: null,
      decision: "Fix the blockers listed above before proceeding."
    };
  }

  // Stage 3: Billing entitlement check
  const entitlements = getEntitlements(user.plan_name);

  if (!entitlements.submission_enabled) {
    return {
      gate: "upgrade",
      reason: "free_plan",
      pipeline,
      billing: { plan: user.plan_name, entitlements },
      decision: "Upgrade to Solo, Builder, or Studio to enable submissions."
    };
  }

  // Stage 4: Submission credit check
  const credits = (mockDb.submission_credits || []).filter(
    (c) => c.project_id === project.id && c.status === "available"
  );

  if (credits.length === 0) {
    return {
      gate: "checkout",
      reason: "no_submission_credit",
      pipeline,
      billing: { plan: user.plan_name, entitlements },
      decision: "Purchase a submission credit to continue."
    };
  }

  // Stage 5: All clear — proceed
  return {
    gate: "proceed",
    reason: "ready",
    pipeline,
    billing: {
      plan: user.plan_name,
      entitlements,
      creditsAvailable: credits.length
    },
    decision: "Project is ready. Proceeding to submission."
  };
}

module.exports = { runGate };
