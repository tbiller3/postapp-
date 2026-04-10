const jwt = require("jsonwebtoken");

const APPLE_API = "https://api.appstoreconnect.apple.com/v1";

function getAppleCredentials() {
  let pk = process.env.APPLE_PRIVATE_KEY || "";
  pk = pk.replace(/\\n/g, "\n");
  if (pk && !pk.includes("-----BEGIN")) {
    pk = "-----BEGIN PRIVATE KEY-----\n" + pk + "\n-----END PRIVATE KEY-----";
  }
  return {
    issuerId: process.env.APPLE_ISSUER_ID || "",
    keyId: process.env.APPLE_KEY_ID || "",
    privateKey: pk
  };
}

function isLive() {
  const creds = getAppleCredentials();
  return !!(creds.issuerId && creds.keyId && creds.privateKey);
}

function validateAppleConfig(config) {
  const issues = [];

  if (!config.bundleId) issues.push("Missing bundle ID");
  if (!config.appName) issues.push("Missing app name");

  if (!isLive()) {
    if (!config.issuerId) issues.push("Missing App Store Connect issuer ID");
    if (!config.keyId) issues.push("Missing API key ID");
    if (!config.privateKey) issues.push("Missing private key");
  }

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

function signJwt() {
  const creds = getAppleCredentials();
  const now = Math.floor(Date.now() / 1000);

  const payload = {
    iss: creds.issuerId,
    iat: now,
    exp: now + 1200,
    aud: "appstoreconnect-v1"
  };

  const token = jwt.sign(payload, creds.privateKey, {
    algorithm: "ES256",
    header: {
      alg: "ES256",
      kid: creds.keyId,
      typ: "JWT"
    }
  });

  return token;
}

async function generateJwt(config) {
  if (!isLive()) {
    return {
      ok: true,
      jwt: "mock_jwt_" + Date.now(),
      expiresIn: 1200,
      message: "JWT generated (mock — no Apple credentials in environment)",
      live: false
    };
  }

  try {
    const token = signJwt();
    return {
      ok: true,
      jwt: token,
      expiresIn: 1200,
      message: "JWT generated with Apple credentials",
      live: true
    };
  } catch (err) {
    return {
      ok: false,
      error: "JWT signing failed: " + err.message,
      live: true
    };
  }
}

async function appleRequest(method, path, body) {
  const token = signJwt();
  const opts = {
    method,
    headers: {
      "Authorization": "Bearer " + token,
      "Content-Type": "application/json"
    }
  };
  if (body) opts.body = JSON.stringify(body);

  const res = await fetch(`${APPLE_API}${path}`, opts);
  const data = await res.json();

  if (!res.ok) {
    const errMsg = data.errors ? data.errors.map(e => e.detail || e.title).join("; ") : "Apple API error";
    return { ok: false, error: errMsg, statusCode: res.status, data };
  }

  return { ok: true, data };
}

async function createApp(config) {
  if (!isLive()) {
    return {
      ok: true,
      appId: "app_" + Date.now(),
      bundleId: config.bundleId,
      message: "App record created (mock)",
      live: false
    };
  }

  try {
    const result = await appleRequest("POST", "/apps", {
      data: {
        type: "apps",
        attributes: {
          bundleId: config.bundleId,
          name: config.appName,
          primaryLocale: "en-US"
        },
        relationships: {
          bundleId: {
            data: {
              type: "bundleIds",
              id: config.bundleId
            }
          }
        }
      }
    });

    if (!result.ok) {
      return { ok: false, error: result.error, live: true };
    }

    return {
      ok: true,
      appId: result.data.data.id,
      bundleId: config.bundleId,
      message: "App record created on App Store Connect",
      live: true
    };
  } catch (err) {
    return { ok: false, error: "Create app failed: " + err.message, live: true };
  }
}

async function lookupApp(bundleId) {
  if (!isLive()) {
    return { ok: false, error: "Mock mode", live: false };
  }

  try {
    const result = await appleRequest("GET", `/apps?filter[bundleId]=${bundleId}`);
    if (!result.ok) return { ok: false, error: result.error, live: true };

    const apps = result.data.data || [];
    if (apps.length === 0) {
      return { ok: true, found: false, message: "No app found with that bundle ID", live: true };
    }

    return {
      ok: true,
      found: true,
      appId: apps[0].id,
      name: apps[0].attributes.name,
      bundleId: apps[0].attributes.bundleId,
      live: true
    };
  } catch (err) {
    return { ok: false, error: "Lookup failed: " + err.message, live: true };
  }
}

async function createVersion(appId, versionString) {
  if (!isLive()) {
    return {
      ok: true,
      versionId: "ver_" + Date.now(),
      versionString,
      message: "Version created (mock)",
      live: false
    };
  }

  try {
    const result = await appleRequest("POST", "/appStoreVersions", {
      data: {
        type: "appStoreVersions",
        attributes: {
          platform: "IOS",
          versionString
        },
        relationships: {
          app: {
            data: {
              type: "apps",
              id: appId
            }
          }
        }
      }
    });

    if (!result.ok) {
      return { ok: false, error: result.error, live: true };
    }

    return {
      ok: true,
      versionId: result.data.data.id,
      versionString,
      message: "Version " + versionString + " created on App Store Connect",
      live: true
    };
  } catch (err) {
    return { ok: false, error: "Create version failed: " + err.message, live: true };
  }
}

async function getAppleStatus(appleState) {
  return {
    configured: isLive() || !!(appleState.config?.issuerId && appleState.config?.keyId),
    jwtActive: !!appleState.jwt,
    appExists: appleState.appExists,
    versionReady: appleState.versionReady,
    status: appleState.status,
    live: isLive()
  };
}

module.exports = {
  validateAppleConfig,
  initAppleState,
  generateJwt,
  createApp,
  createVersion,
  getAppleStatus,
  lookupApp,
  isLive
};
