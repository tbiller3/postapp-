function evaluateSigning(signing) {
  let score = 100;
  const issues = [];

  if (!signing.bundleId) {
    score -= 25;
    issues.push("Missing bundle ID");
  }
  if (!signing.certificateReady) {
    score -= 25;
    issues.push("Signing certificate not ready");
  }
  if (!signing.provisioningReady) {
    score -= 25;
    issues.push("Provisioning profile not ready");
  }
  if (!signing.exportMethod) {
    score -= 10;
    issues.push("Export method not selected");
  }
  if (!signing.nativeBuildSelected) {
    score -= 15;
    issues.push("Native build not selected");
  }

  return {
    score: Math.max(score, 0),
    issues,
    ready: issues.length === 0
  };
}

module.exports = { evaluateSigning };
