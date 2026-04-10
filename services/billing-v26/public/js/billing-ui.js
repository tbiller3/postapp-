const navItems = document.querySelectorAll(".nav-item");
const views = document.querySelectorAll(".view");
const uiLogBox = document.getElementById("uiLogBox");

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

async function runPipeline() {
  const btn = document.getElementById("runPipelineBtn");
  const stagesEl = document.getElementById("pipelineStages");
  const logEl = document.getElementById("pipelineLog");
  const summaryEl = document.getElementById("pipelineSummary");
  const summaryTitle = document.getElementById("pipelineSummaryTitle");

  const stageIds = ["upload", "analyze", "autofix", "billing", "submission"];

  btn.disabled = true;
  btn.textContent = "Running…";

  stagesEl.style.display = "block";
  logEl.style.display = "block";
  summaryEl.style.display = "none";
  logEl.textContent = "";

  stageIds.forEach((id) => {
    document.getElementById(`status-${id}`).textContent = "—";
    document.getElementById(`stage-${id}`).className = "pipeline-stage";
  });

  addUiLog("One-Click Pipeline started.");

  try {
    const res = await fetch("/api/pipeline/run", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ project: {} })
    });

    const data = await res.json();

    if (data.log) {
      logEl.textContent = data.log.join("\n");
    }

    const stageMap = {
      upload: data.stages?.upload,
      analyze: data.stages?.analyze,
      autofix: data.stages?.autoFix,
      billing: data.stages?.billing,
      submission: data.stages?.submission
    };

    for (const [id, stage] of Object.entries(stageMap)) {
      const el = document.getElementById(`status-${id}`);
      const row = document.getElementById(`stage-${id}`);
      if (!stage) continue;
      if (stage.status === "ok" || stage.status === "ready") {
        el.textContent = "✓";
        row.classList.add("stage-ok");
      } else if (stage.status === "blocked") {
        el.textContent = "✗ Blocked";
        row.classList.add("stage-blocked");
      } else if (stage.status === "skipped") {
        el.textContent = "— Skipped";
        row.classList.add("stage-skipped");
      }
    }

    summaryEl.style.display = "block";
    if (data.ok) {
      const s = data.summary;
      summaryTitle.textContent =
        `Pipeline complete — Score ${s.initialScore} → ${s.finalScore} | ` +
        `${s.fixesApplied} fix(es) applied | ${s.readiness} readiness | Ready to submit`;
      summaryEl.style.background = "#d4edda";
    } else {
      summaryTitle.textContent =
        `Pipeline blocked — upgrade required (plan: ${data.stages?.billing?.plan})`;
      summaryEl.style.background = "#f8d7da";
    }

    addUiLog(`Pipeline finished. ok=${data.ok}`);
  } catch (err) {
    logEl.textContent = "Pipeline request failed.";
    addUiLog("Pipeline request failed.");
  }

  btn.disabled = false;
  btn.textContent = "Run One-Click Pipeline";
}

async function runAnalyzer() {
  const res = await fetch("/api/analyzer/analyze");
  const data = await res.json();

  document.getElementById("analysisResults").innerHTML =
    JSON.stringify(data, null, 2);
}

document.addEventListener("DOMContentLoaded", () => {
  bindPricingButtons();
  refreshBillingUi();

  const refreshBtn = document.getElementById("refreshBillingBtn");
  if (refreshBtn) {
    refreshBtn.addEventListener("click", refreshBillingUi);
  }

  const standardBtn = document.getElementById("openStandardCheckout");
  const complexBtn = document.getElementById("openComplexCheckout");
  const grantBtn = document.getElementById("grantDevCreditBtn");

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
});
