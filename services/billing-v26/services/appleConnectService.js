function validateAppleConfig(config) {
  const issues = [];

  if (!config.issuerId) issues.push("Missing App Store Connect issuer ID");
  if (!config.keyId) issues.push("Missing API key ID");
  if (!config.privateKey) issues.push("Missing private key");
  if (!config.bundleId) issues.push("Missing bundle ID");
  if (!config.appName) issues.push("Missing app name");

  return {
    valid: issues.length === 0,
    issues
  };
}

function initAppleState() {
  return {
    config: {
      issuerId: "",
      keyId: "",
      privateKey: "",
      bundleId: "",
      appName: ""
    },
    jwt: null,
    appExists: false,
    appId: "",
    versionReady: false,
    versionString: "1.0.0",
    status: "idle"
  };
}

async function generateJwt(config) {
  const validation = validateAppleConfig(config);
  if (!validation.valid) {
    return { ok: false, error: "Invalid config", issues: validation.issues };
  }

  return {
    ok: true,
    jwt: "mock_jwt_" + Date.now(),
    expiresIn: 1200,
    message: "JWT generated (mock)"
  };
}

async function createApp(config) {
  return {
    ok: true,
    appId: "app_" + Date.now(),
    bundleId: config.bundleId,
    message: "App record created (mock)"
  };
}

async function createVersion(appId, versionString) {
  return {
    ok: true,
    versionId: "ver_" + Date.now(),
    versionString,
    message: "Version created (mock)"
  };
}

async function getAppleStatus(appleState) {
  return {
    configured: !!(appleState.config?.issuerId && appleState.config?.keyId),
    jwtActive: !!appleState.jwt,
    appExists: appleState.appExists,
    versionReady: appleState.versionReady,
    status: appleState.status
  };
}

module.exports = {
  validateAppleConfig,
  initAppleState,
  generateJwt,
  createApp,
  createVersion,
  getAppleStatus
};
