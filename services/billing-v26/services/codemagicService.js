const CODEMAGIC_API = "https://api.codemagic.io";

function getToken() {
  return process.env.CODEMAGIC_API_TOKEN || "";
}

function isLive() {
  return !!getToken();
}

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

  if (!isLive()) {
    return {
      ok: true,
      buildId: "mock_build_" + Date.now(),
      status: "queued",
      message: "Build queued (mock mode — no CODEMAGIC_API_TOKEN)",
      live: false
    };
  }

  try {
    const res = await fetch(`${CODEMAGIC_API}/builds`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-auth-token": getToken()
      },
      body: JSON.stringify({
        appId: config.appId,
        workflowId: config.workflowId,
        branch: config.branch
      })
    });

    const data = await res.json();

    if (!res.ok) {
      return {
        ok: false,
        error: data.message || data.error || "Codemagic API error",
        statusCode: res.status,
        live: true
      };
    }

    return {
      ok: true,
      buildId: data._id || data.buildId,
      status: "queued",
      message: "Build queued on Codemagic",
      live: true
    };
  } catch (err) {
    return {
      ok: false,
      error: "Codemagic API request failed: " + err.message,
      live: true
    };
  }
}

async function pollBuildStatus(buildId) {
  if (!isLive() || buildId.startsWith("mock_build_")) {
    return {
      buildId,
      status: "building",
      progress: 45,
      message: "Building iOS archive... (mock mode)",
      live: false
    };
  }

  try {
    const res = await fetch(`${CODEMAGIC_API}/builds/${buildId}`, {
      headers: {
        "x-auth-token": getToken()
      }
    });

    const data = await res.json();

    if (!res.ok) {
      return {
        buildId,
        status: "error",
        message: data.message || "Could not fetch build status",
        live: true
      };
    }

    const build = data.build || data;
    const status = build.status || "unknown";

    let artifactUrl = "";
    let ipaReady = false;

    if (build.artefacts && build.artefacts.length > 0) {
      const ipa = build.artefacts.find(a => a.name && a.name.endsWith(".ipa"));
      if (ipa) {
        artifactUrl = ipa.url || "";
        ipaReady = true;
      }
    }

    return {
      buildId,
      status,
      message: build.message || `Build ${status}`,
      startedAt: build.startedAt || null,
      finishedAt: build.finishedAt || null,
      artifactUrl,
      ipaReady,
      live: true
    };
  } catch (err) {
    return {
      buildId,
      status: "error",
      message: "Poll failed: " + err.message,
      live: true
    };
  }
}

async function listBuilds(appId) {
  if (!isLive()) {
    return { ok: false, error: "No CODEMAGIC_API_TOKEN set", live: false };
  }

  try {
    const res = await fetch(`${CODEMAGIC_API}/builds?appId=${appId}`, {
      headers: {
        "x-auth-token": getToken()
      }
    });

    const data = await res.json();

    if (!res.ok) {
      return { ok: false, error: data.message || "Failed to list builds", live: true };
    }

    const builds = (data.builds || []).map(b => ({
      buildId: b._id,
      status: b.status,
      branch: b.branch,
      startedAt: b.startedAt,
      finishedAt: b.finishedAt
    }));

    return { ok: true, builds, live: true };
  } catch (err) {
    return { ok: false, error: err.message, live: true };
  }
}

module.exports = {
  validateBuildConfig,
  initBuildState,
  triggerBuild,
  pollBuildStatus,
  listBuilds,
  isLive
};
