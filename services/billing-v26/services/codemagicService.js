function validateBuildConfig(config) {
  const issues = [];

  if (!config.appId) issues.push("Missing Codemagic app ID");
  if (!config.workflowId) issues.push("Missing workflow ID");
  if (!config.branch) issues.push("Missing branch name");
  if (!config.bundleId) issues.push("Missing bundle ID");

  return {
    valid: issues.length === 0,
    issues
  };
}

function initBuildState() {
  return {
    buildId: "",
    status: "idle",
    ipaReady: false,
    artifactUrl: "",
    logs: [],
    startedAt: null,
    finishedAt: null,
    config: {
      appId: "",
      workflowId: "ios-release",
      branch: "main",
      bundleId: ""
    }
  };
}

async function triggerBuild(config) {
  const validation = validateBuildConfig(config);
  if (!validation.valid) {
    return { ok: false, error: "Invalid config", issues: validation.issues };
  }

  return {
    ok: true,
    buildId: "build_" + Date.now(),
    status: "queued",
    message: "Build queued on Codemagic"
  };
}

async function pollBuildStatus(buildId) {
  return {
    buildId,
    status: "building",
    progress: 45,
    message: "Building iOS archive..."
  };
}

module.exports = {
  validateBuildConfig,
  initBuildState,
  triggerBuild,
  pollBuildStatus
};
