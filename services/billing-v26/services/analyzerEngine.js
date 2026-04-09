function analyzeProject(project) {
  let score = 100;
  let issues = [];

  // Privacy Policy
  if (!project.privacyPolicy) {
    score -= 25;
    issues.push({
      type: "blocker",
      message: "Missing privacy policy",
      fix: "generate_privacy_policy"
    });
  }

  // Support URL
  if (!project.supportUrl) {
    score -= 15;
    issues.push({
      type: "high",
      message: "Missing support URL",
      fix: "add_support_url"
    });
  }

  // Screenshots
  if (!project.screenshots || project.screenshots.length < 3) {
    score -= 15;
    issues.push({
      type: "high",
      message: "Incomplete screenshots",
      fix: "generate_screenshots"
    });
  }

  // Metadata
  if (!project.description || project.description.length < 100) {
    score -= 10;
    issues.push({
      type: "medium",
      message: "Metadata too short",
      fix: "expand_metadata"
    });
  }

  // Web wrapper risk
  if (project.isWebWrapper) {
    score -= 10;
    issues.push({
      type: "medium",
      message: "App may be rejected as simple web wrapper",
      fix: "enhance_native_features"
    });
  }

  return {
    score,
    issues,
    readiness: getReadiness(score)
  };
}

function getReadiness(score) {
  if (score > 85) return "High";
  if (score > 70) return "Medium";
  return "Low";
}

module.exports = { analyzeProject };
