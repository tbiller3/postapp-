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
    document.getElementById("shotsIphone69").value = (project.screenshotMatrix.iphone69 || []).join(", ");
    document.getElementById("shotsIphone65").value = (project.screenshotMatrix.iphone65 || []).join(", ");
    document.getElementById("shotsIpad13").value = (project.screenshotMatrix.ipad13 || []).join(", ");
    document.getElementById("shotsIpad129").value = (project.screenshotMatrix.ipad129 || []).join(", ");
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
    row.className = `timeline-item ${item.status || "complete"}`;
    row.innerHTML = `
      <div>
        <strong>${item.label}</strong>
        <p>${item.key} • ${new Date(item.at).toLocaleString()}</p>
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

document.addEventListener("DOMContentLoaded", async () => {
  bindPricingButtons();
  await refreshBillingUi();
  await refreshTimeline();

  const refreshBtn = document.getElementById("refreshBillingBtn");
  if (refreshBtn) {
    refreshBtn.addEventListener("click", refreshBillingUi);
  }

  const timelineBtn = document.getElementById("refreshTimelineBtn");
  if (timelineBtn) {
    timelineBtn.addEventListener("click", refreshTimeline);
  }

  const saveMetaBtn = document.getElementById("saveMetadataBtn");
  const scoreMetaBtn = document.getElementById("scoreMetadataBtn");
  const saveShotsBtn = document.getElementById("saveScreenshotsBtn");
  const scoreShotsBtn = document.getElementById("scoreScreenshotsBtn");

  if (saveMetaBtn) saveMetaBtn.addEventListener("click", saveMetadata);
  if (scoreMetaBtn) scoreMetaBtn.addEventListener("click", scoreMetadata);
  if (saveShotsBtn) saveShotsBtn.addEventListener("click", saveScreenshotMatrix);
  if (scoreShotsBtn) scoreShotsBtn.addEventListener("click", scoreScreenshots);

  const standardBtn = document.getElementById("openStandardCheckout");
  const complexBtn = document.getElementById("openComplexCheckout");
  const grantBtn = document.getElementById("grantDevCreditBtn");
  const savePipelineBtn = document.getElementById("savePipelineProjectBtn");
  const runPipelineBtn = document.getElementById("runPipelineBtn");
  const saveReviewerBtn = document.getElementById("saveReviewerBtn");

  if (standardBtn) {
    standardBtn.addEventListener("click", () => {
      openSubmissionCheckoutModal({
        projectId: document.getElementById("projectIdInput").value.trim(),
        projectName: document.getElementById("projectNameInput").value.trim(),
        submissionType: "standard"
      });
    });
  }

  if (complexBtn) {
    complexBtn.addEventListener("click", () => {
      openSubmissionCheckoutModal({
        projectId: document.getElementById("projectIdInput").value.trim(),
        projectName: document.getElementById("projectNameInput").value.trim(),
        submissionType: "complex"
      });
    });
  }

  if (grantBtn) {
    grantBtn.addEventListener("click", async () => {
      const projectId = document.getElementById("projectIdInput").value.trim();
      await grantDevCredit(projectId);
    });
  }

  if (savePipelineBtn) {
    savePipelineBtn.addEventListener("click", savePipelineProject);
  }

  if (runPipelineBtn) {
    runPipelineBtn.addEventListener("click", runPipeline);
  }

  if (saveReviewerBtn) {
    saveReviewerBtn.addEventListener("click", saveReviewerInfo);
  }

  try {
    const res = await fetch("/api/pipeline/project");
    const data = await res.json();
    if (data.ok) renderPipelineProject(data.project);
  } catch (err) {
    addUiLog("Could not load pipeline project.");
  }
});
