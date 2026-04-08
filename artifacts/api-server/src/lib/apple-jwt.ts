import jwt from "jsonwebtoken";

export type AppleCredentialStatus = "configured" | "unconfigured";

export function getAppleCredentialStatus(): AppleCredentialStatus {
  const issuerId = process.env["APPLE_ISSUER_ID"];
  const keyId = process.env["APPLE_KEY_ID"];
  const hasKey = !!(process.env["APPLE_PRIVATE_KEY"] || process.env["APPLE_PRIVATE_KEY_BASE64"]);
  return issuerId && keyId && hasKey ? "configured" : "unconfigured";
}

export function generateAppleJWT(): string {
  const issuerId = process.env["APPLE_ISSUER_ID"];
  const keyId = process.env["APPLE_KEY_ID"];

  let privateKey = process.env["APPLE_PRIVATE_KEY"];
  if (!privateKey && process.env["APPLE_PRIVATE_KEY_BASE64"]) {
    privateKey = Buffer.from(process.env["APPLE_PRIVATE_KEY_BASE64"], "base64").toString("utf8");
  }

  if (!issuerId || !keyId || !privateKey) {
    throw new Error("Apple Connect credentials not configured. Set APPLE_ISSUER_ID, APPLE_KEY_ID, and APPLE_PRIVATE_KEY.");
  }

  return jwt.sign({}, privateKey, {
    algorithm: "ES256",
    issuer: issuerId,
    audience: "appstoreconnect-v1",
    expiresIn: "20m",
    keyid: keyId,
  });
}
