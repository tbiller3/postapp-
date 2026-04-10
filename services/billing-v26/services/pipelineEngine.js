const { analyzeProject } = require("./analyzerEngine");
const { runFix } = require("./autoFixEngine");
const { getEntitlements } = require("./billingService");

async function runPipeline({ project, user }) {
  const log = [];
  const stages = {};

  // Stage 1: Upload
  log.push("[1/5] Upload: Project received.");
  stages.upload = { status: "ok", project: { ...project } };

  // Stage 2: Analyze
  const initialAnalysis = analyzeProject(project);
  log.push(
    `[2/5] Analyze: Score ${initialAnalysis.score} — ${initialAnalysis.readiness} readiness. ` +
    `${initialAnalysis.issues.length} issue(s) found.`
  );
  stages.analyze = { status: "ok", result: initialAnalysis };

  // Stage 3: Auto-Fix
  const fixable = initialAnalysis.issues.filter((i) => i.fix);
  const applied = [];

  for (const issue of fixable) {
    const msg = runFix(issue.fix, project);
    applied.push({ fix: issue.fix, message: msg });
    log.push(`[3/5] Auto-Fix: ${msg}`);
  }

  if (applied.length === 0) {
    log.push("[3/5] Auto-Fix: No fixable issues — skipped.");
  }

  const postFixAnalysis = analyzeProject(project);
  stages.autoFix = {
    status: "ok",
    fixesApplied: applied.length,
    fixes: applied,
    postFixScore: postFixAnalysis.score,
    result: postFixAnalysis
  };

  // Stage 4: Validate Billing
  const entitlements = getEntitlements(user.plan_name);
  const billingOk = entitlements.submission_enabled;

  log.push(
    `[4/5] Billing: Plan "${user.plan_name}" — submission_enabled: ${billingOk}`
  );

  stages.billing = {
    status: billingOk ? "ok" : "blocked",
    plan: user.plan_name,
    submission_enabled: billingOk,
    entitlements
  };

  if (!billingOk) {
    log.push("[4/5] Billing: BLOCKED — upgrade required to submit.");
    stages.submission = { status: "skipped", reason: "billing_not_enabled" };

    return {
      ok: false,
      blocked: true,
      reason: "billing_not_enabled",
      log,
      stages,
      summary: {
        initialScore: initialAnalysis.score,
        finalScore: postFixAnalysis.score,
        fixesApplied: applied.length,
        readiness: postFixAnalysis.readiness,
        submissionReady: false
      }
    };
  }

  // Stage 5: Start Submission
  log.push("[5/5] Submission: Pipeline complete — project is ready to submit.");
  stages.submission = {
    status: "ready",
    message: "Project cleared all checks. Ready for App Store submission.",
    finalScore: postFixAnalysis.score,
    readiness: postFixAnalysis.readiness
  };

  return {
    ok: true,
    blocked: false,
    log,
    stages,
    summary: {
      initialScore: initialAnalysis.score,
      finalScore: postFixAnalysis.score,
      fixesApplied: applied.length,
      readiness: postFixAnalysis.readiness,
      submissionReady: true
    }
  };
}

module.exports = { runPipeline };
