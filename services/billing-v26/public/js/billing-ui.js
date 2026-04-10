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

function renderPipelineProject(project) {
  document.getElementById("pipelineProjectId").value = project.id || "proj_123";
  document.getElementById("pipelineProjectName").value = project.name || "";
  document.getElementById("pipelineDescription").value = project.description || "";
  document.getElementById("pipelinePrivacyPolicy").value = project.privacyPolicy || "";
  document.getElementById("pipelineSupportUrl").value = project.supportUrl || "";
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
  await loadTimeline();
}

async function routeSubmissionNextStep(pipeline) {
  const projectId = document.getElementById("pipelineProjectId").value.trim();
  const projectName = document.getElementById("pipelineProjectName").value.trim();

  if (!pipeline.ok) {
    document.getElementById("pipelineNextActionLabel").textContent = "fix_blockers";
    addUiLog("Pipeline blocked. Fix blockers first.");
    return;
  }

  if (!window.POSTAPP_USER.entitlements.submission_enabled) {
    document.getElementById("pipelineNextActionLabel").textContent = "upgrade_required";
    addUiLog("Submission requires a paid plan.");
    openUpgradeModal("submission_enabled");
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
  await loadTimeline();
}

// ─── Reviewer Mode ─────────────────────────────────────────────────────────

async function loadReviewerCredentials() {
  try {
    const res = await fetch("/api/pipeline/project");
    const data = await res.json();
    if (data.ok && data.project.reviewer) renderReviewer(data.project.reviewer);
  } catch (err) {}
}

function renderReviewer(reviewer) {
  document.getElementById("reviewerEmail").value = reviewer.email || "";
  document.getElementById("reviewerPassword").value = reviewer.password || "";
  document.getElementById("reviewerInstructions").value = reviewer.instructions || "";
  document.getElementById("reviewerDemoNotes").value = reviewer.demoNotes || reviewer.notes || "";
  document.getElementById("reviewerFeatureExplanation").value = reviewer.featureExplanation || "";
  document.getElementById("reviewerSpecialAccess").value = reviewer.specialAccess || "";
}

async function saveReviewerCredentials() {
  const payload = {
    email: document.getElementById("reviewerEmail").value.trim(),
    password: document.getElementById("reviewerPassword").value.trim(),
    instructions: document.getElementById("reviewerInstructions").value.trim(),
    demoNotes: document.getElementById("reviewerDemoNotes").value.trim(),
    featureExplanation: document.getElementById("reviewerFeatureExplanation").value.trim(),
    specialAccess: document.getElementById("reviewerSpecialAccess").value.trim()
  };

  const res = await fetch("/api/pipeline/reviewer", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  const data = await res.json();
  if (data.ok) addUiLog("Reviewer credentials saved.");
}

// ─── Submission Timeline ────────────────────────────────────────────────────

const TIMELINE_LABELS = {
  project_created:           "Project Created",
  project_updated:           "Project Updated",
  reviewer_updated:          "Reviewer Info Saved",
  pipeline_run:              "Pipeline Run",
  submission_blocked:        "Submission Blocked",
  submission_credit_granted: "Submission Credit Granted",
  submission_credit_used:    "Submission Credit Used",
  submission_started:        "Submission Started",
  waiting_review:            "Waiting for App Review",
  approved:                  "App Approved",
  rejected:                  "App Rejected",
  resubmission_needed:       "Resubmission Needed"
};

async function loadTimeline() {
  try {
    const [projRes, subRes] = await Promise.all([
      fetch("/api/pipeline/project"),
      fetch("/api/submissions/timeline")
    ]);

    const projData = await projRes.json();
    const subData  = await subRes.json();

    const projEvents = projData.ok ? (projData.project.timeline || []) : [];
    const subEvents  = subData.ok  ? (subData.timeline || [])          : [];

    const all = [...projEvents, ...subEvents].sort(
      (a, b) => new Date(a.at) - new Date(b.at)
    );

    renderTimeline(all);
  } catch (err) {}
}

function renderTimeline(events) {
  const box = document.getElementById("timelineContainer");
  if (!box) return;
  box.innerHTML = "";

  if (!events.length) {
    box.innerHTML =
      '<p style="color:var(--text-soft);font-size:0.9rem;margin:0;">No events yet. Run the pipeline to start.</p>';
    return;
  }

  events.forEach((event) => {
    const item = document.createElement("div");
    item.className = "timeline-item";

    const dot = document.createElement("div");
    dot.className = "timeline-dot " + (event.status || "complete");
    item.appendChild(dot);

    const content = document.createElement("div");
    content.className = "timeline-content";

    const label = document.createElement("div");
    label.className = "timeline-label";
    label.textContent = event.label || TIMELINE_LABELS[event.key] || event.key;
    content.appendChild(label);

    if (event.at) {
      const time = document.createElement("div");
      time.className = "timeline-time";
      time.textContent = new Date(event.at).toLocaleString();
      content.appendChild(time);
    }

    item.appendChild(content);
    box.appendChild(item);
  });
}

async function addTimelineEvent(key, label, status = "complete") {
  await fetch("/api/pipeline/timeline", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ key, label: label || TIMELINE_LABELS[key] || key, status })
  });
  await loadTimeline();
}

document.addEventListener("DOMContentLoaded", async () => {
  bindPricingButtons();
  await refreshBillingUi();

  const refreshBtn = document.getElementById("refreshBillingBtn");
  if (refreshBtn) {
    refreshBtn.addEventListener("click", refreshBillingUi);
  }

  const standardBtn = document.getElementById("openStandardCheckout");
  const complexBtn = document.getElementById("openComplexCheckout");
  const grantBtn = document.getElementById("grantDevCreditBtn");
  const savePipelineBtn = document.getElementById("savePipelineProjectBtn");
  const runPipelineBtn = document.getElementById("runPipelineBtn");

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

  const saveReviewerBtn = document.getElementById("saveReviewerBtn");
  if (saveReviewerBtn) {
    saveReviewerBtn.addEventListener("click", saveReviewerCredentials);
  }

  const resetTimelineBtn = document.getElementById("resetTimelineBtn");
  if (resetTimelineBtn) {
    resetTimelineBtn.addEventListener("click", async () => {
      await loadTimeline();
      addUiLog("Timeline refreshed.");
    });
  }

  const logTimelineEventBtn = document.getElementById("logTimelineEventBtn");
  if (logTimelineEventBtn) {
    logTimelineEventBtn.addEventListener("click", async () => {
      const key    = document.getElementById("timelineStageSelect").value;
      const status = document.getElementById("timelineStatusSelect").value;
      const note   = document.getElementById("timelineNoteInput").value.trim();
      const label  = (note ? `${TIMELINE_LABELS[key] || key}: ${note}` : TIMELINE_LABELS[key] || key);
      await addTimelineEvent(key, label, status);
      document.getElementById("timelineNoteInput").value = "";
      addUiLog(`Timeline event logged: ${label} (${status})`);
    });
  }

  await loadTimeline();
  await loadReviewerCredentials();

  try {
    const res = await fetch("/api/pipeline/project");
    const data = await res.json();
    if (data.ok) renderPipelineProject(data.project);
  } catch (err) {
    addUiLog("Could not load pipeline project.");
  }
});
