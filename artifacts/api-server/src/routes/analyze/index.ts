import { Router } from "express";
import { db } from "@workspace/db";
import { appsTable, checklistTable, wrapConfigsTable, screenshotsTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";

const router = Router();

type Severity = "blocker" | "high" | "medium" | "info";

interface Finding {
  severity: Severity;
  category: string;
  message: string;
  fix?: string;
}

interface AnalysisReport {
  score: number;
  label: string;
  findings: Finding[];
  blockers: Finding[];
  highRisk: Finding[];
  medium: Finding[];
  nextActions: string[];
  meta: {
    urlReachable: boolean | null;
    hasViewport: boolean | null;
    hasPrivacyLink: boolean | null;
    hasLoginForm: boolean | null;
    checklistTotal: number;
    checklistComplete: number;
    screenshotCount: number;
  };
}

// GET /api/apps/:id/analyze
router.get("/apps/:id/analyze", async (req, res) => {
  try {
    const appId = parseInt(req.params.id, 10);

    // Load all data in parallel
    const [appRows, checklistRows, wrapRows, screenshotRows] = await Promise.all([
      db.select().from(appsTable).where(eq(appsTable.id, appId)),
      db.select().from(checklistTable).where(eq(checklistTable.appId, appId)),
      db.select().from(wrapConfigsTable).where(eq(wrapConfigsTable.appId, appId)),
      db.select().from(screenshotsTable).where(eq(screenshotsTable.appId, appId)).catch(() => []),
    ]);

    if (!appRows.length) {
      res.status(404).json({ error: "App not found" });
      return;
    }

    const app = appRows[0];
    const wrap = wrapRows[0] || null;
    const findings: Finding[] = [];

    // ─── URL / WebView Analysis ───────────────────────────────────────────────
    let urlReachable: boolean | null = null;
    let hasViewport: boolean | null = null;
    let hasPrivacyLink: boolean | null = null;
    let hasLoginForm: boolean | null = null;
    let html = "";

    const targetUrl = wrap?.webUrl || app.replitUrl;
    if (targetUrl) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 8000);
        const urlRes = await fetch(targetUrl, {
          signal: controller.signal,
          headers: { "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1" },
        });
        clearTimeout(timeout);
        urlReachable = urlRes.ok;

        if (urlRes.ok) {
          html = await urlRes.text();
          hasViewport = /viewport/i.test(html);
          hasPrivacyLink = /privacy.policy|privacy-policy|privacypolicy/i.test(html);
          hasLoginForm = /<input[^>]+type=["']?password["']?/i.test(html);

          if (!hasViewport) {
            findings.push({
              severity: "high",
              category: "WebView",
              message: "No mobile viewport meta tag detected",
              fix: 'Add <meta name="viewport" content="width=device-width, initial-scale=1"> to your app\'s HTML',
            });
          }

          if (hasLoginForm && !hasPrivacyLink) {
            findings.push({
              severity: "blocker",
              category: "App Review",
              message: "App has login/account creation but no visible privacy policy link",
              fix: "Add a privacy policy page and link it from your app. Apple requires this for any app with accounts.",
            });
          } else if (!hasPrivacyLink) {
            findings.push({
              severity: "high",
              category: "App Review",
              message: "No privacy policy link detected on the app",
              fix: "Add a privacy policy link. Even if your app collects no data, Apple requires a privacy policy URL.",
            });
          }

          if (hasLoginForm) {
            findings.push({
              severity: "high",
              category: "App Review",
              message: "Login form detected — reviewer credentials required",
              fix: 'Add test account credentials in your submission notes (Review tab → Review Notes). Without them, Apple will reject.',
            });
          }

          // Check for very short content (might be an error page)
          if (html.length < 500) {
            findings.push({
              severity: "high",
              category: "WebView",
              message: "App URL returned very little content — may be an error or empty page",
              fix: "Verify your app URL loads correctly in a browser before submitting.",
            });
          }

          // Web wrapper risk heuristic
          const hasNativeFeatures = /geolocation|camera|notification|push|accelerometer|vibrate/i.test(html);
          const isMinimalWrapper = html.length < 5000 && !hasNativeFeatures;
          if (isMinimalWrapper) {
            findings.push({
              severity: "high",
              category: "App Review",
              message: "App may appear as a plain website wrapper to Apple reviewers",
              fix: "Add native device features (location, push notifications, haptics) via Capacitor to demonstrate native value.",
            });
          }
        } else {
          urlReachable = false;
          findings.push({
            severity: "blocker",
            category: "Availability",
            message: `App URL returned HTTP ${urlRes.status} — app is not reachable`,
            fix: "Make sure your web app is deployed and publicly accessible before submitting.",
          });
        }
      } catch {
        urlReachable = false;
        findings.push({
          severity: "blocker",
          category: "Availability",
          message: "App URL is not reachable or timed out",
          fix: "Ensure the web app is deployed and accessible. A private or localhost URL will fail Apple review.",
        });
      }
    } else {
      findings.push({
        severity: "blocker",
        category: "Setup",
        message: "No app URL configured",
        fix: "Set your deployed web app URL in the Wrap tab configuration.",
      });
    }

    // ─── Metadata Analysis ────────────────────────────────────────────────────
    if (!app.privacyPolicyUrl) {
      findings.push({
        severity: "blocker",
        category: "Metadata",
        message: "No privacy policy URL set in app metadata",
        fix: "Add a privacy policy URL in the Submission tab. This is required for App Store approval.",
      });
    }

    if (!app.supportUrl) {
      findings.push({
        severity: "high",
        category: "Metadata",
        message: "No support URL configured",
        fix: "Add a support URL (can be a contact page or email link) in the Submission tab.",
      });
    }

    if (!app.description || String(app.description || "").length < 80) {
      findings.push({
        severity: "medium",
        category: "Metadata",
        message: "App description is missing or too short",
        fix: "Write a compelling description (at least 150 characters) explaining what your app does and why users need it.",
      });
    }

    if (!app.keywords || String(app.keywords || "").length < 10) {
      findings.push({
        severity: "medium",
        category: "Metadata",
        message: "Keywords not set or too sparse",
        fix: "Add up to 100 characters of comma-separated keywords to improve discoverability.",
      });
    }

    if (!app.subtitle) {
      findings.push({
        severity: "medium",
        category: "Metadata",
        message: "No subtitle configured",
        fix: "Add a subtitle (up to 30 characters) — it appears below your app name in search results.",
      });
    }

    if (!app.ageRating) {
      findings.push({
        severity: "medium",
        category: "Metadata",
        message: "Age rating not set",
        fix: "Set your age rating in the Submission tab. Apple requires this before submission.",
      });
    }

    // ─── Asset Analysis ───────────────────────────────────────────────────────
    const screenshotCount = screenshotRows.length;
    if (screenshotCount === 0) {
      findings.push({
        severity: "blocker",
        category: "Assets",
        message: "No screenshots uploaded",
        fix: "Upload at least one screenshot for iPhone 6.7\" display. Use the Assets tab to manage screenshots.",
      });
    } else if (screenshotCount < 3) {
      findings.push({
        severity: "high",
        category: "Assets",
        message: `Only ${screenshotCount} screenshot${screenshotCount === 1 ? "" : "s"} — Apple expects at least 3`,
        fix: "Upload 3–10 screenshots showing your app's key features and flows.",
      });
    }

    // ─── Build / Signing Analysis ─────────────────────────────────────────────
    if (!wrap) {
      findings.push({
        severity: "blocker",
        category: "Build",
        message: "Wrap configuration not set up — no native iOS build path",
        fix: "Go to the Wrap tab and configure your app URL, bundle ID, and build settings.",
      });
    } else {
      if (!wrap.codemagicAppId) {
        findings.push({
          severity: "blocker",
          category: "Build",
          message: "No Codemagic App ID configured — builds cannot be triggered",
          fix: "Set the Codemagic App ID in the Wrap tab Configure step.",
        });
      }
      if (!wrap.githubRepoFullName) {
        findings.push({
          severity: "blocker",
          category: "Build",
          message: "No GitHub repository configured for build pipeline",
          fix: "Set the GitHub repo in the Wrap tab Configure step.",
        });
      }
      if (wrap.lastBuildStatus === "failed" || !wrap.lastBuildStatus) {
        if (wrap.codemagicAppId) {
          findings.push({
            severity: "high",
            category: "Build",
            message: wrap.lastBuildStatus === "failed" ? "Last build failed — no valid IPA exists" : "No successful build recorded yet",
            fix: "Go to the Build tab and trigger a new build. Check build logs for code signing issues.",
          });
        }
      }
    }

    // ─── Checklist Analysis ───────────────────────────────────────────────────
    const checklistTotal = checklistRows.length;
    const checklistComplete = checklistRows.filter(i => i.completed).length;
    const incompleteItems = checklistRows.filter(i => !i.completed);

    for (const item of incompleteItems) {
      const severity: Severity = item.label.toLowerCase().includes("screenshot") ||
        item.label.toLowerCase().includes("binary") ||
        item.label.toLowerCase().includes("privacy") ? "blocker" : "medium";
      findings.push({
        severity,
        category: "Checklist",
        message: `Checklist: "${item.label}"`,
        fix: "Mark this item complete in the Checklist tab once resolved.",
      });
    }

    // ─── Score Calculation ────────────────────────────────────────────────────
    const blockers = findings.filter(f => f.severity === "blocker");
    const highRisk = findings.filter(f => f.severity === "high");
    const medium = findings.filter(f => f.severity === "medium");

    // Penalty-based scoring
    let score = 100;
    score -= blockers.length * 18;
    score -= highRisk.length * 8;
    score -= medium.length * 3;
    score = Math.max(0, Math.min(100, score));

    // Bonus for checklist completion
    if (checklistTotal > 0) {
      const checklistRatio = checklistComplete / checklistTotal;
      if (checklistRatio === 1) score = Math.min(100, score + 5);
      else if (checklistRatio < 0.5) score = Math.max(0, score - 5);
    }

    score = Math.round(score);

    const label =
      score >= 90 ? "Submission Ready" :
      score >= 70 ? "Almost Ready" :
      score >= 50 ? "Needs Work" :
      score >= 25 ? "Early Stage" :
      "Not Ready";

    // ─── Next Actions ─────────────────────────────────────────────────────────
    const nextActions: string[] = [];
    const allIssues = [...blockers, ...highRisk, ...medium];
    const seen = new Set<string>();

    for (const f of allIssues) {
      if (f.fix && !seen.has(f.fix)) {
        seen.add(f.fix);
        nextActions.push(f.fix);
        if (nextActions.length >= 5) break;
      }
    }

    if (nextActions.length === 0) {
      nextActions.push("All major issues resolved — trigger a build in the Wrap tab to generate your IPA.");
    }

    const report: AnalysisReport = {
      score,
      label,
      findings,
      blockers,
      highRisk,
      medium,
      nextActions,
      meta: {
        urlReachable,
        hasViewport,
        hasPrivacyLink,
        hasLoginForm,
        checklistTotal,
        checklistComplete,
        screenshotCount,
      },
    };

    res.json(report);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Analysis failed" });
  }
});

export default router;
