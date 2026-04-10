if (window.__POSTAPP_RUNNING__) {
  console.log("POSTAPP already initialized — skipping duplicate init.");
} else {
window.__POSTAPP_RUNNING__ = true;

const navItems = document.querySelectorAll(".nav-item");
const views = document.querySelectorAll(".view");
const uiLogBox = document.getElementById("uiLogBox");

window.POSTAPP_USER = {
  plan: "free",
  entitlements: {}
};

function getEntitlements(planName = "free") {
  const plans = {
    free: {
      full_analyzer: false,
      submission_enabled: false,
      templates_enabled: false
    },
    solo: {
      full_analyzer: true,
      submission_enabled: true,
      templates_enabled: true
    },
    builder: {
      full_analyzer: true,
      submission_enabled: true,
      templates_enabled: true
    },
    studio: {
      full_analyzer: true,
      submission_enabled: true,
      templates_enabled: true
    }
  };

  return plans[planName] || plans.free;
}

navItems.forEach((item) => {
  item.addEventListener("click", () => {
    navItems.forEach((i) => i.classList.remove("active"));
    views.forEach((v) => v.classList.remove("active"));

    item.classList.add("active");
    document.getElementById(item.dataset.view).classList.add("active");
  });
});

function addUiLog(message) {
  if (!uiLogBox) return;
  const entry = document.createElement("div");
  entry.className = "log-entry";
  entry.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;
  uiLogBox.prepend(entry);
}

function addLogToBox(boxId, message) {
  const box = document.getElementById(boxId);
  if (!box) return;
  const entry = document.createElement("div");
  entry.className = "log-entry";
  entry.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;
  box.prepend(entry);
}

async function createPlanCheckout(planName) {
  const res = await fetch("/api/billing/create-checkout-session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ planName })
  });

  const data = await res.json();

  if (!res.ok) {
    alert(data.error || "Could not start checkout.");
    return;
  }

  window.location.href = data.url;
}

function startUpgrade(plan) {
  createPlanCheckout(plan);
}

function openUpgradeModal(feature = "submission_enabled") {
  const modal = document.getElementById("upgradeModal");
  const reason = document.getElementById("upgradeReason");

  const messages = {
    full_analyzer: "Unlock full App Store readiness analysis.",
    submission_enabled: "Upgrade to continue into the App Store submission workflow.",
    templates_enabled: "Upgrade to use reusable templates."
  };

  reason.textContent = messages[feature] || "Upgrade required.";
  modal.classList.remove("hidden");
}

function closeUpgradeModal() {
  document.getElementById("upgradeModal").classList.add("hidden");
}

async function createSubmissionCheckout(projectId, submissionType = "standard") {
  const res = await fetch("/api/billing/create-submission-session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ projectId, submissionType })
  });

  const data = await res.json();

  if (!res.ok) {
    alert(data.error || "Could not start submission checkout.");
    return;
  }

  window.location.href = data.url;
}

function bindPricingButtons() {
  document.querySelectorAll("[data-plan-button]").forEach((btn) => {
    btn.addEventListener("click", () => {
      createPlanCheckout(btn.dataset.planButton);
    });
  });
}

function openSubmissionCheckoutModal({
  projectId,
  projectName,
  submissionType = "standard"
}) {
  const modal = document.getElementById("submissionCheckoutModal");
  const nameEl = document.getElementById("submissionProjectName");
  const typeEl = document.getElementById("submissionTypeLabel");
  const priceEl = document.getElementById("submissionPriceLabel");
  const confirmBtn = document.getElementById("confirmSubmissionCheckout");
  const cancelBtn = document.getElementById("cancelSubmissionCheckout");

  nameEl.textContent = `Project: ${projectName}`;
  typeEl.textContent = submissionType === "complex" ? "Complex App" : "Standard App";
  priceEl.textContent = submissionType === "complex" ? "$349+" : "$199";

  modal.classList.remove("hidden");

  const confirmHandler = async () => {
    confirmBtn.removeEventListener("click", confirmHandler);
    cancelBtn.removeEventListener("click", cancelHandler);
    modal.classList.add("hidden");
    addUiLog(`Starting ${submissionType} submission checkout for ${projectName}`);
    await createSubmissionCheckout(projectId, submissionType);
  };

  const cancelHandler = () => {
    confirmBtn.removeEventListener("click", confirmHandler);
    cancelBtn.removeEventListener("click", cancelHandler);
    modal.classList.add("hidden");
    addUiLog("Submission checkout canceled.");
  };

  confirmBtn.addEventListener("click", confirmHandler);
  cancelBtn.addEventListener("click", cancelHandler);
}

async function checkBillingStatus() {
  const res = await fetch("/api/billing/status");
  const data = await res.json();
  return data;
}

async function refreshBillingUi() {
  try {
    const data = await checkBillingStatus();

    document.getElementById("planLabel").textContent = data.plan || "free";
    document.getElementById("subscriptionLabel").textContent = data.subscription_status || "inactive";
    document.getElementById("customerLabel").textContent = data.stripe_customer_id || "none";

    window.POSTAPP_USER = {
      plan: data.plan || "free",
      entitlements: getEntitlements(data.plan || "free")
    };

    addUiLog("Billing status refreshed.");
  } catch (err) {
    addUiLog("Could not load billing status.");
  }
}

async function grantDevCredit(projectId) {
  const res = await fetch("/api/submissions/grant-dev-credit", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ projectId, type: "standard" })
  });

  const data = await res.json();

  if (!res.ok) {
    addUiLog(data.error || "Could not grant dev credit.");
    return;
  }

  addUiLog(`Dev credit granted for project ${projectId}`);
  await refreshTimeline();
}

async function checkSubmissionCredit(projectId) {
  const res = await fetch(`/api/submissions/credit-status/${projectId}`);
  const data = await res.json();
  return data.hasCredit;
}

async function savePipelineProject() {
  const payload = {
    id: document.getElementById("pipelineProjectId").value.trim(),
    name: document.getElementById("pipelineProjectName").value.trim(),
    description: document.getElementById("pipelineDescription").value.trim(),
    privacyPolicy: document.getElementById("pipelinePrivacyPolicy").value.trim() || null,
    supportUrl: document.getElementById("pipelineSupportUrl").value.trim() || null
  };

  const res = await fetch("/api/pipeline/project", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  const data = await res.json();

  if (data.ok) {
    renderPipelineProject(data.project);
  }
}

async function saveMetadata() {
  const payload = {
    appName: document.getElementById("metaAppName").value.trim(),
    subtitle: document.getElementById("metaSubtitle").value.trim(),
    keywords: document.getElementById("metaKeywords").value.trim(),
    promoText: document.getElementById("metaPromoText").value.trim(),
    description: document.getElementById("metaDescription").value.trim(),
    supportUrl: document.getElementById("metaSupportUrl").value.trim(),
    privacyPolicyUrl: document.getElementById("metaPrivacyUrl").value.trim()
  };

  const res = await fetch("/api/pipeline/metadata", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  const data = await res.json();

  if (data.ok) {
    addUiLog("Metadata saved.");
    await refreshTimeline();
  }
}

async function scoreMetadata() {
  const res = await fetch("/api/pipeline/metadata-score");
  const data = await res.json();

  document.getElementById("metadataScoreLabel").textContent = data.score;
  document.getElementById("metadataReadinessLabel").textContent = data.readiness;

  const box = document.getElementById("metadataIssuesBox");
  box.innerHTML = "";

  (data.issues || []).forEach((issue) => {
    const entry = document.createElement("div");
    entry.className = "log-entry";
    entry.textContent = issue;
    box.appendChild(entry);
  });

  if (!data.issues?.length) {
    box.innerHTML = '<div class="log-entry">No metadata issues found.</div>';
  }
}

const screenshotFiles = { iphone69: [], iphone65: [], ipad13: [], ipad129: [] };

function initScreenshotDropZones() {
  const devices = ["iphone69", "iphone65", "ipad13", "ipad129"];
  devices.forEach(device => {
    const zone = document.querySelector(`.drop-zone[data-target="${device}"]`);
    const input = zone?.querySelector(".file-input");
    if (!zone || !input) return;

    zone.addEventListener("dragover", (e) => { e.preventDefault(); zone.classList.add("dragover"); });
    zone.addEventListener("dragleave", () => zone.classList.remove("dragover"));
    zone.addEventListener("drop", (e) => {
      e.preventDefault();
      zone.classList.remove("dragover");
      handleScreenshotFiles(device, Array.from(e.dataTransfer.files));
    });
    input.addEventListener("change", (e) => {
      handleScreenshotFiles(device, Array.from(e.target.files));
      e.target.value = "";
    });
  });
}

function handleScreenshotFiles(device, files) {
  const imageFiles = files.filter(f => f.type.startsWith("image/"));
  imageFiles.forEach(file => {
    const name = file.name.replace(/\.[^.]+$/, "");
    if (!screenshotFiles[device].find(s => s.name === name)) {
      const url = URL.createObjectURL(file);
      screenshotFiles[device].push({ name, url, file });
    }
  });
  syncScreenshotInput(device);
  renderThumbnails(device);
  updateBadge(device);
}

function removeScreenshot(device, name) {
  screenshotFiles[device] = screenshotFiles[device].filter(s => s.name !== name);
  syncScreenshotInput(device);
  renderThumbnails(device);
  updateBadge(device);
}

function syncScreenshotInput(device) {
  const inputMap = { iphone69: "shotsIphone69", iphone65: "shotsIphone65", ipad13: "shotsIpad13", ipad129: "shotsIpad129" };
  const el = document.getElementById(inputMap[device]);
  if (el) el.value = screenshotFiles[device].map(s => s.name).join(", ");
}

function renderThumbnails(device) {
  const container = document.getElementById("thumbs" + device.charAt(0).toUpperCase() + device.slice(1));
  if (!container) return;
  container.innerHTML = "";
  screenshotFiles[device].forEach(s => {
    const div = document.createElement("div");
    div.className = "thumb-item";
    div.innerHTML = `<img src="${s.url}" alt="${s.name}" /><button class="thumb-remove" data-device="${device}" data-name="${s.name}">&times;</button><div class="thumb-name">${s.name}</div>`;
    container.appendChild(div);
  });
  container.querySelectorAll(".thumb-remove").forEach(btn => {
    btn.addEventListener("click", () => removeScreenshot(btn.dataset.device, btn.dataset.name));
  });
}

function updateBadge(device) {
  const badgeMap = { iphone69: "badgeIphone69", iphone65: "badgeIphone65", ipad13: "badgeIpad13", ipad129: "badgeIpad129" };
  const badge = document.getElementById(badgeMap[device]);
  if (!badge) return;
  const count = screenshotFiles[device].length;
  badge.textContent = count + " / 3";
  if (count >= 3) { badge.classList.add("ready"); } else { badge.classList.remove("ready"); }
}

function getThumbContainerId(device) {
  const map = { iphone69: "thumbsIphone69", iphone65: "thumbsIphone65", ipad13: "thumbsIpad13", ipad129: "thumbsIpad129" };
  return map[device];
}

async function saveScreenshotMatrix() {
  const payload = {
    iphone69: parseList(document.getElementById("shotsIphone69").value),
    iphone65: parseList(document.getElementById("shotsIphone65").value),
    ipad13: parseList(document.getElementById("shotsIpad13").value),
    ipad129: parseList(document.getElementById("shotsIpad129").value)
  };

  const res = await fetch("/api/pipeline/screenshots", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  const data = await res.json();

  if (data.ok) {
    addUiLog("Screenshot matrix saved.");
    await scoreScreenshots();
    await refreshTimeline();
  }
}

async function scoreScreenshots() {
  const res = await fetch("/api/pipeline/screenshot-score");
  const data = await res.json();

  document.getElementById("screenshotScoreLabel").textContent = data.score;
  document.getElementById("screenshotIphone69Label").textContent = data.statuses.iphone69;
  document.getElementById("screenshotIphone65Label").textContent = data.statuses.iphone65;
  document.getElementById("screenshotIpad13Label").textContent = data.statuses.ipad13;
  document.getElementById("screenshotIpad129Label").textContent = data.statuses.ipad129;

  const devices = ["iphone69", "iphone65", "ipad13", "ipad129"];
  devices.forEach(d => {
    const badge = document.getElementById("badge" + d.charAt(0).toUpperCase() + d.slice(1));
    if (badge && data.statuses[d] === "complete") badge.classList.add("ready");
  });
}

function parseList(text) {
  return text
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

async function saveReviewerInfo() {
  const payload = {
    email: document.getElementById("reviewerEmail").value.trim(),
    password: document.getElementById("reviewerPassword").value.trim(),
    instructions: document.getElementById("reviewerInstructions").value.trim(),
    notes: document.getElementById("reviewerNotes").value.trim()
  };

  const res = await fetch("/api/pipeline/reviewer", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  const data = await res.json();

  if (data.ok) {
    renderReviewerInfo(data.reviewer);
    addUiLog("Reviewer info saved.");
    await refreshTimeline();
  }
}

function renderReviewerInfo(reviewer) {
  document.getElementById("reviewerEmail").value = reviewer.email || "";
  document.getElementById("reviewerPassword").value = reviewer.password || "";
  document.getElementById("reviewerInstructions").value = reviewer.instructions || "";
  document.getElementById("reviewerNotes").value = reviewer.notes || "";

  document.getElementById("reviewerPreviewEmail").textContent = reviewer.email || "—";
  document.getElementById("reviewerPreviewPassword").textContent = reviewer.password || "—";
  document.getElementById("reviewerPreviewInstructions").textContent = reviewer.instructions || "—";
  document.getElementById("reviewerPreviewNotes").textContent = reviewer.notes || "—";
}

function renderPipelineProject(project) {
  document.getElementById("pipelineProjectId").value = project.id || "proj_123";
  document.getElementById("pipelineProjectName").value = project.name || "";
  document.getElementById("pipelineDescription").value = project.description || "";
  document.getElementById("pipelinePrivacyPolicy").value = project.privacyPolicy || "";
  document.getElementById("pipelineSupportUrl").value = project.supportUrl || "";

  if (project.reviewer) {
    renderReviewerInfo(project.reviewer);
  }

  if (project.metadata) {
    document.getElementById("metaAppName").value = project.metadata.appName || "";
    document.getElementById("metaSubtitle").value = project.metadata.subtitle || "";
    document.getElementById("metaKeywords").value = project.metadata.keywords || "";
    document.getElementById("metaPromoText").value = project.metadata.promoText || "";
    document.getElementById("metaDescription").value = project.metadata.description || "";
    document.getElementById("metaSupportUrl").value = project.metadata.supportUrl || "";
    document.getElementById("metaPrivacyUrl").value = project.metadata.privacyPolicyUrl || "";
  }

  if (project.screenshotMatrix) {
    const devices = ["iphone69", "iphone65", "ipad13", "ipad129"];
    const inputMap = { iphone69: "shotsIphone69", iphone65: "shotsIphone65", ipad13: "shotsIpad13", ipad129: "shotsIpad129" };
    devices.forEach(device => {
      const names = project.screenshotMatrix[device] || [];
      document.getElementById(inputMap[device]).value = names.join(", ");
      screenshotFiles[device] = names.map(n => ({ name: n, url: "/screenshots/" + n + ".png", file: null }));
      renderThumbnails(device);
      updateBadge(device);
    });
  }

  if (project.signingPrep) {
    document.getElementById("signingBundleId").value = project.signingPrep.bundleId || "";
    document.getElementById("signingExportMethod").value = project.signingPrep.exportMethod || "";
    document.getElementById("signingCertReady").value = project.signingPrep.certificateReady ? "true" : "false";
    document.getElementById("signingProvReady").value = project.signingPrep.provisioningReady ? "true" : "false";
    document.getElementById("signingNativeBuild").value = project.signingPrep.nativeBuildSelected ? "true" : "false";
  }

  if (project.buildState?.config) {
    document.getElementById("buildAppId").value = project.buildState.config.appId || "";
    document.getElementById("buildWorkflowId").value = project.buildState.config.workflowId || "ios-release";
    document.getElementById("buildBranch").value = project.buildState.config.branch || "main";
    document.getElementById("buildBundleId").value = project.buildState.config.bundleId || "";
  }

  if (project.appleState?.config) {
    document.getElementById("appleIssuerId").value = project.appleState.config.issuerId || "";
    document.getElementById("appleKeyId").value = project.appleState.config.keyId || "";
    document.getElementById("applePrivateKey").value = project.appleState.config.privateKey || "";
    document.getElementById("appleBundleId").value = project.appleState.config.bundleId || "";
    document.getElementById("appleAppName").value = project.appleState.config.appName || "";
  }
}

function renderPipelineSteps(steps) {
  const box = document.getElementById("pipelineSteps");
  box.innerHTML = "";

  steps.forEach((step) => {
    const entry = document.createElement("div");
    entry.className = "log-entry";
    entry.textContent = `${step.key.toUpperCase()} • ${step.status} • ${step.message}`;
    box.appendChild(entry);
  });
}

async function startSubmissionFlow(projectId) {
  const res = await fetch("/api/submissions/start", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ projectId })
  });

  const data = await res.json();

  if (!res.ok) {
    addUiLog(data.message || "Submission start failed.");
    return;
  }

  document.getElementById("pipelineNextActionLabel").textContent = "submission_started";
  addUiLog("Submission workflow started successfully.");
  await refreshTimeline();
}

async function routeSubmissionNextStep(pipeline) {
  const projectId = document.getElementById("pipelineProjectId").value.trim();
  const projectName = document.getElementById("pipelineProjectName").value.trim();

  if (!pipeline.ok) {
    document.getElementById("pipelineNextActionLabel").textContent = "fix_blockers";
    addUiLog("Pipeline blocked. Fix blockers first.");
    await refreshTimeline();
    return;
  }

  if (!window.POSTAPP_USER.entitlements.submission_enabled) {
    document.getElementById("pipelineNextActionLabel").textContent = "upgrade_required";
    addUiLog("Submission requires a paid plan.");
    openUpgradeModal("submission_enabled");
    await refreshTimeline();
    return;
  }

  const hasCredit = await checkSubmissionCredit(projectId);

  if (!hasCredit) {
    document.getElementById("pipelineNextActionLabel").textContent = "purchase_submission";
    addUiLog("No submission credit found. Opening checkout.");
    openSubmissionCheckoutModal({
      projectId,
      projectName,
      submissionType: "standard"
    });
    await refreshTimeline();
    return;
  }

  document.getElementById("pipelineNextActionLabel").textContent = "start_submission";
  addUiLog("Submission credit found. Starting submission flow.");
  await startSubmissionFlow(projectId);
}

async function runPipeline() {
  await savePipelineProject();

  const res = await fetch("/api/pipeline/run", {
    method: "POST"
  });

  const data = await res.json();

  if (!data.ok) return;

  const pipeline = data.pipeline;

  document.getElementById("pipelineStageLabel").textContent = pipeline.stage;
  document.getElementById("pipelineScoreLabel").textContent = pipeline.analysis?.score ?? "—";
  document.getElementById("pipelineReadinessLabel").textContent = pipeline.analysis?.readiness ?? "—";

  renderPipelineSteps(pipeline.steps);
  await routeSubmissionNextStep(pipeline);
}

async function refreshTimeline() {
  const res = await fetch("/api/submissions/timeline");
  const data = await res.json();

  const list = document.getElementById("timelineList");
  list.innerHTML = "";

  const timeline = data.timeline || [];

  if (!timeline.length) {
    list.innerHTML = '<div class="timeline-item"><strong>No timeline events yet.</strong></div>';
    return;
  }

  timeline.forEach((item) => {
    const row = document.createElement("div");
    row.className = `timeline-item ${item.status || "info"}`;
    row.innerHTML = `
      <div>
        <strong>${item.message || item.label || ""}</strong>
        <p>${item.type || item.key || ""} • ${new Date(item.timestamp || item.at).toLocaleString()}</p>
      </div>
      <span class="timeline-status">${item.status}</span>
    `;
    list.appendChild(row);
  });
}

async function updateReviewStatus(status) {
  const res = await fetch("/api/submissions/review-status", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status })
  });

  const data = await res.json();

  if (data.ok) {
    addUiLog(`Review status updated: ${status}`);
    await refreshTimeline();
  }
}

async function saveSigning() {
  const payload = {
    bundleId: document.getElementById("signingBundleId").value.trim(),
    exportMethod: document.getElementById("signingExportMethod").value,
    certificateReady: document.getElementById("signingCertReady").value === "true",
    provisioningReady: document.getElementById("signingProvReady").value === "true",
    nativeBuildSelected: document.getElementById("signingNativeBuild").value === "true"
  };

  const res = await fetch("/api/pipeline/signing/update", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  const data = await res.json();

  if (data.ok) {
    document.getElementById("signingScoreLabel").textContent = data.score;
    document.getElementById("signingReadyLabel").textContent = data.ready ? "Yes" : "No";
    renderIssues("signingIssuesBox", data.issues);
    addUiLog("Signing config saved.");
    await refreshTimeline();
  }
}

async function scoreSigning() {
  const res = await fetch("/api/pipeline/signing-score");
  const data = await res.json();

  document.getElementById("signingScoreLabel").textContent = data.score;
  document.getElementById("signingReadyLabel").textContent = data.ready ? "Yes" : "No";
  renderIssues("signingIssuesBox", data.issues);
}

function renderIssues(boxId, issues) {
  const box = document.getElementById(boxId);
  if (!box) return;
  box.innerHTML = "";

  if (!issues || !issues.length) {
    box.innerHTML = '<div class="log-entry">No issues found.</div>';
    return;
  }

  issues.forEach((issue) => {
    const entry = document.createElement("div");
    entry.className = "log-entry";
    entry.textContent = issue;
    box.appendChild(entry);
  });
}

async function saveBuildConfig() {
  const payload = {
    appId: document.getElementById("buildAppId").value.trim(),
    workflowId: document.getElementById("buildWorkflowId").value.trim(),
    branch: document.getElementById("buildBranch").value.trim(),
    bundleId: document.getElementById("buildBundleId").value.trim()
  };

  const res = await fetch("/api/pipeline/build-config", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  const data = await res.json();

  if (data.ok) {
    addLogToBox("buildLogBox", "Build config saved.");
  }
}

async function validateBuild() {
  const res = await fetch("/api/pipeline/build-config/validate");
  const data = await res.json();

  if (data.valid) {
    addLogToBox("buildLogBox", "Build config is valid.");
  } else {
    data.issues.forEach((i) => addLogToBox("buildLogBox", "Issue: " + i));
  }
}

async function startBuild() {
  const res = await fetch("/api/pipeline/build/start", { method: "POST" });
  const data = await res.json();

  if (!data.ok) {
    addLogToBox("buildLogBox", "Build failed: " + (data.error || "unknown"));
    if (data.issues) data.issues.forEach((i) => addLogToBox("buildLogBox", "Issue: " + i));
    return;
  }

  document.getElementById("buildIdLabel").textContent = data.buildState.buildId || "—";
  document.getElementById("buildStatusLabel").textContent = data.buildState.status || "idle";
  addLogToBox("buildLogBox", "Build started: " + data.buildState.buildId);
  await refreshTimeline();
}

async function pollBuild() {
  const res = await fetch("/api/pipeline/build/status");
  const data = await res.json();

  document.getElementById("buildStatusLabel").textContent = data.status || "idle";
  addLogToBox("buildLogBox", `Build status: ${data.status} — ${data.message || ""}`);
}

async function saveAppleConfig() {
  const payload = {
    issuerId: document.getElementById("appleIssuerId").value.trim(),
    keyId: document.getElementById("appleKeyId").value.trim(),
    privateKey: document.getElementById("applePrivateKey").value.trim(),
    bundleId: document.getElementById("appleBundleId").value.trim(),
    appName: document.getElementById("appleAppName").value.trim()
  };

  const res = await fetch("/api/pipeline/apple-config", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  const data = await res.json();

  if (data.ok) {
    addLogToBox("appleLogBox", "Apple config saved.");
  }
}

async function validateApple() {
  const res = await fetch("/api/pipeline/apple-config/validate");
  const data = await res.json();

  if (data.valid) {
    addLogToBox("appleLogBox", "Apple config is valid.");
  } else {
    data.issues.forEach((i) => addLogToBox("appleLogBox", "Issue: " + i));
  }
}

async function generateAppleJwt() {
  const res = await fetch("/api/pipeline/apple/generate-jwt", { method: "POST" });
  const data = await res.json();

  if (!data.ok) {
    addLogToBox("appleLogBox", "JWT failed: " + (data.error || "unknown"));
    return;
  }

  document.getElementById("appleJwtLabel").textContent = "Active";
  addLogToBox("appleLogBox", "JWT generated, expires in " + data.expiresIn + "s");
  await refreshTimeline();
}

async function createAppleApp() {
  const res = await fetch("/api/pipeline/apple/create-app", { method: "POST" });
  const data = await res.json();

  if (data.ok) {
    document.getElementById("appleAppExistsLabel").textContent = "Yes";
    addLogToBox("appleLogBox", "App created: " + data.appId);
    await refreshTimeline();
  }
}

async function createAppleVersion() {
  const res = await fetch("/api/pipeline/apple/create-version", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ versionString: "1.0.0" })
  });

  const data = await res.json();

  if (data.ok) {
    document.getElementById("appleVersionLabel").textContent = "Yes (" + data.versionString + ")";
    addLogToBox("appleLogBox", "Version created: " + data.versionString);
    await refreshTimeline();
  }
}

async function checkAppleStatus() {
  const res = await fetch("/api/pipeline/apple/status");
  const data = await res.json();

  document.getElementById("appleConfiguredLabel").textContent = data.configured ? "Yes" : "No";
  document.getElementById("appleJwtLabel").textContent = data.jwtActive ? "Active" : "None";
  document.getElementById("appleAppExistsLabel").textContent = data.appExists ? "Yes" : "No";
  document.getElementById("appleVersionLabel").textContent = data.versionReady ? "Yes" : "No";
}

async function saveUploadConfig() {
  const payload = {
    route: document.getElementById("uploadRoute").value
  };

  const res = await fetch("/api/pipeline/upload/config", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  const data = await res.json();

  if (data.ok) {
    document.getElementById("uploadRouteLabel").textContent = data.uploadState.route;
    addLogToBox("uploadLogBox", "Upload config saved.");
  }
}

async function prepareUploadAction() {
  const res = await fetch("/api/pipeline/upload/prepare", { method: "POST" });
  const data = await res.json();

  if (!data.ok) {
    addLogToBox("uploadLogBox", "Prepare failed: " + (data.error || "unknown"));
    return;
  }

  addLogToBox("uploadLogBox", "Upload prepared. Route: " + data.route);
}

async function startUploadAction() {
  const res = await fetch("/api/pipeline/upload/start", { method: "POST" });
  const data = await res.json();

  if (data.ok) {
    document.getElementById("uploadIdLabel").textContent = data.uploadState.uploadId || "—";
    document.getElementById("uploadStatusLabel").textContent = data.uploadState.status;
    addLogToBox("uploadLogBox", "Upload started: " + data.uploadState.uploadId);
    await refreshTimeline();
  }
}

async function checkUploadStatus() {
  const res = await fetch("/api/pipeline/upload/status");
  const data = await res.json();

  document.getElementById("uploadIdLabel").textContent = data.uploadState.uploadId || "—";
  document.getElementById("uploadStatusLabel").textContent = data.uploadState.status;
  document.getElementById("uploadRouteLabel").textContent = data.uploadState.route;
}

async function refreshLaunchDashboard() {
  const res = await fetch("/api/pipeline/launch-dashboard");
  const data = await res.json();

  const gates = data.gates || {};
  const gateMap = {
    metadata: "gateMetadataLabel",
    screenshots: "gateScreenshotsLabel",
    reviewer: "gateReviewerLabel",
    signing: "gateSigningLabel",
    build: "gateBuildLabel",
    apple: "gateAppleLabel",
    upload: "gateUploadLabel"
  };

  for (const [key, elId] of Object.entries(gateMap)) {
    const el = document.getElementById(elId);
    if (el) {
      el.textContent = gates[key] ? "Ready" : "Not Ready";
      el.style.color = gates[key] ? "#d2ffe5" : "#ffd2d2";
    }
  }
}

async function finalCheck() {
  const res = await fetch("/api/pipeline/launch/final-check");
  const data = await res.json();

  const box = document.getElementById("launchBlockersBox");
  box.innerHTML = "";

  if (data.ready) {
    box.innerHTML = '<div class="log-entry" style="color:#d2ffe5">All checks passed. Ready to submit.</div>';
  } else {
    (data.blockers || []).forEach((b) => {
      const entry = document.createElement("div");
      entry.className = "log-entry";
      entry.style.color = "#ffd2d2";
      entry.textContent = b;
      box.appendChild(entry);
    });
  }
}

async function submitForReview() {
  const res = await fetch("/api/pipeline/launch/submit", { method: "POST" });
  const data = await res.json();

  if (!data.ok) {
    const box = document.getElementById("launchBlockersBox");
    box.innerHTML = "";
    (data.blockers || []).forEach((b) => {
      const entry = document.createElement("div");
      entry.className = "log-entry";
      entry.style.color = "#ffd2d2";
      entry.textContent = b;
      box.appendChild(entry);
    });
    return;
  }

  addLogToBox("launchBlockersBox", data.message);
  await refreshTimeline();
}

async function refreshGuidedFlow() {
  const res = await fetch("/api/pipeline/launch-dashboard");
  const data = await res.json();
  const g = data.gates || {};

  const statusMap = {
    guidedMetaStatus: g.metadata,
    guidedShotsStatus: g.screenshots,
    guidedSigningStatus: g.signing,
    guidedBuildStatus: g.build,
    guidedAppleStatus: g.apple,
    guidedUploadStatus: g.upload,
    guidedReviewerStatus: g.reviewer,
    guidedLaunchStatus: data.allReady
  };

  for (const [id, ready] of Object.entries(statusMap)) {
    const el = document.getElementById(id);
    if (el) {
      el.textContent = ready ? "Done" : "Pending";
      el.style.color = ready ? "#d2ffe5" : "#ffd2d2";
    }
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  bindPricingButtons();
  await refreshBillingUi();
  await refreshTimeline();

  const bind = (id, handler) => {
    const el = document.getElementById(id);
    if (el && !el.dataset.bound) {
      el.dataset.bound = "true";
      el.addEventListener("click", handler);
    }
  };

  bind("refreshBillingBtn", refreshBillingUi);
  bind("refreshTimelineBtn", refreshTimeline);
  bind("saveMetadataBtn", saveMetadata);
  bind("scoreMetadataBtn", scoreMetadata);
  bind("saveScreenshotsBtn", saveScreenshotMatrix);
  bind("scoreScreenshotsBtn", scoreScreenshots);
  initScreenshotDropZones();
  bind("savePipelineProjectBtn", savePipelineProject);
  bind("runPipelineBtn", runPipeline);
  bind("saveReviewerBtn", saveReviewerInfo);

  bind("saveSigningBtn", saveSigning);
  bind("scoreSigningBtn", scoreSigning);

  bind("saveBuildConfigBtn", saveBuildConfig);
  bind("validateBuildBtn", validateBuild);
  bind("startBuildBtn", startBuild);
  bind("pollBuildBtn", pollBuild);

  bind("saveAppleConfigBtn", saveAppleConfig);
  bind("validateAppleBtn", validateApple);
  bind("generateJwtBtn", generateAppleJwt);
  bind("createAppBtn", createAppleApp);
  bind("createVersionBtn", createAppleVersion);
  bind("appleStatusBtn", checkAppleStatus);

  bind("saveUploadConfigBtn", saveUploadConfig);
  bind("prepareUploadBtn", prepareUploadAction);
  bind("startUploadBtn", startUploadAction);
  bind("checkUploadBtn", checkUploadStatus);

  bind("refreshLaunchBtn", refreshLaunchDashboard);
  bind("finalCheckBtn", finalCheck);
  bind("submitLaunchBtn", submitForReview);
  bind("refreshGuidedBtn", refreshGuidedFlow);

  bind("openStandardCheckout", () => {
    openSubmissionCheckoutModal({
      projectId: document.getElementById("projectIdInput").value.trim(),
      projectName: document.getElementById("projectNameInput").value.trim(),
      submissionType: "standard"
    });
  });

  bind("openComplexCheckout", () => {
    openSubmissionCheckoutModal({
      projectId: document.getElementById("projectIdInput").value.trim(),
      projectName: document.getElementById("projectNameInput").value.trim(),
      submissionType: "complex"
    });
  });

  bind("grantDevCreditBtn", async () => {
    const projectId = document.getElementById("projectIdInput").value.trim();
    await grantDevCredit(projectId);
  });

  initAgent();

  try {
    const res = await fetch("/api/pipeline/project");
    const data = await res.json();
    if (data.ok) renderPipelineProject(data.project);
  } catch (err) {
    addUiLog("Could not load pipeline project.");
  }
});

function initAgent() {
  const toggle = document.getElementById("agentToggle");
  const panel = document.getElementById("agentPanel");
  const close = document.getElementById("agentClose");
  const input = document.getElementById("agentInput");
  const send = document.getElementById("agentSend");
  const messages = document.getElementById("agentMessages");

  if (!toggle || !panel) return;

  toggle.addEventListener("click", () => {
    panel.classList.toggle("hidden");
    if (!panel.classList.contains("hidden")) input.focus();
  });

  close.addEventListener("click", () => panel.classList.add("hidden"));

  send.addEventListener("click", () => sendAgentMessage());
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendAgentMessage(); }
  });

  document.querySelectorAll(".agent-quick").forEach(btn => {
    btn.addEventListener("click", () => {
      input.value = btn.dataset.msg;
      sendAgentMessage();
    });
  });
}

function addAgentMessage(content, type) {
  const messages = document.getElementById("agentMessages");
  const div = document.createElement("div");
  div.className = "agent-msg agent-msg-" + type;
  div.innerHTML = `<div class="agent-msg-content">${escapeHtml(content)}</div>`;
  messages.appendChild(div);
  messages.scrollTop = messages.scrollHeight;
}

function addAgentAction(toolName) {
  const messages = document.getElementById("agentMessages");
  const div = document.createElement("div");
  div.className = "agent-msg-action";
  const label = toolName.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
  div.innerHTML = `<span class="action-dot"></span> ${label}`;
  messages.appendChild(div);
  messages.scrollTop = messages.scrollHeight;
}

function showAgentTyping() {
  const messages = document.getElementById("agentMessages");
  const div = document.createElement("div");
  div.className = "agent-msg agent-msg-bot";
  div.id = "agentTyping";
  div.innerHTML = `<div class="agent-typing"><span></span><span></span><span></span></div>`;
  messages.appendChild(div);
  messages.scrollTop = messages.scrollHeight;
}

function removeAgentTyping() {
  const el = document.getElementById("agentTyping");
  if (el) el.remove();
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

async function sendAgentMessage() {
  const input = document.getElementById("agentInput");
  const msg = input.value.trim();
  if (!msg) return;

  input.value = "";
  addAgentMessage(msg, "user");
  showAgentTyping();

  try {
    const res = await fetch("/api/agent/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: msg })
    });

    removeAgentTyping();
    const data = await res.json();

    if (data.actions && data.actions.length > 0) {
      data.actions.forEach(a => addAgentAction(a.tool));
    }

    if (data.ok && data.reply) {
      addAgentMessage(data.reply, "bot");
    } else if (data.error) {
      addAgentMessage("Error: " + data.error, "bot");
    }
  } catch (err) {
    removeAgentTyping();
    addAgentMessage("Connection error. Please try again.", "bot");
  }
}

}
