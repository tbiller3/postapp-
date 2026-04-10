const express = require("express");
const router = express.Router();
const { runOneClickPipeline } = require("../services/pipelineEngine");
const { evaluateSigning } = require("../services/signingService");
const { validateBuildConfig, triggerBuild, pollBuildStatus, isLive: isCodemagicLive } = require("../services/codemagicService");
const { generateJwt, getAppleStatus, isLive: isAppleLive } = require("../services/appleConnectService");

const OPENAI_BASE = process.env.AI_INTEGRATIONS_OPENAI_BASE_URL;
const OPENAI_KEY = process.env.AI_INTEGRATIONS_OPENAI_API_KEY;

const SYSTEM_PROMPT = `You are the POSTAPP Agent — an expert iOS App Store submission co-pilot built into POSTAPP.

Your job is to guide users through the entire App Store submission process and take actions on their behalf.

You can:
- Check readiness scores (metadata, screenshots, signing, pipeline)
- Save metadata fields (app name, description, keywords, etc.)
- Check and update signing configuration
- Check build status and trigger builds
- Generate Apple Connect JWTs and check Apple status
- Check the launch dashboard for blockers
- Run the full pipeline

When the user asks you to do something, use the available tools to take action. After taking an action, report back clearly what happened.

When guiding, be concise and direct. Tell them exactly what needs to happen next, and offer to do it for them.

Keep responses short and actionable. You're a co-pilot, not a lecturer.`;

const TOOLS = [
  {
    type: "function",
    function: {
      name: "check_metadata_score",
      description: "Check the current metadata readiness score and any issues",
      parameters: { type: "object", properties: {}, required: [] }
    }
  },
  {
    type: "function",
    function: {
      name: "check_screenshot_score",
      description: "Check screenshot readiness across all device sizes",
      parameters: { type: "object", properties: {}, required: [] }
    }
  },
  {
    type: "function",
    function: {
      name: "check_signing_score",
      description: "Check code signing readiness score",
      parameters: { type: "object", properties: {}, required: [] }
    }
  },
  {
    type: "function",
    function: {
      name: "check_build_status",
      description: "Check the current Codemagic build status",
      parameters: { type: "object", properties: {}, required: [] }
    }
  },
  {
    type: "function",
    function: {
      name: "start_build",
      description: "Trigger a new Codemagic build",
      parameters: { type: "object", properties: {}, required: [] }
    }
  },
  {
    type: "function",
    function: {
      name: "check_apple_status",
      description: "Check Apple App Store Connect status",
      parameters: { type: "object", properties: {}, required: [] }
    }
  },
  {
    type: "function",
    function: {
      name: "generate_apple_jwt",
      description: "Generate a new Apple App Store Connect JWT token",
      parameters: { type: "object", properties: {}, required: [] }
    }
  },
  {
    type: "function",
    function: {
      name: "check_launch_readiness",
      description: "Check all pipeline gates and blockers for launch readiness",
      parameters: { type: "object", properties: {}, required: [] }
    }
  },
  {
    type: "function",
    function: {
      name: "run_pipeline",
      description: "Run the full submission pipeline (analyze, auto-fix, score)",
      parameters: { type: "object", properties: {}, required: [] }
    }
  },
  {
    type: "function",
    function: {
      name: "get_project_overview",
      description: "Get the full project state including all sections",
      parameters: { type: "object", properties: {}, required: [] }
    }
  }
];

function getProject(req) {
  return req.app._pipelineProject || null;
}

function getPipelineProject(req) {
  try {
    const pipelineRoutes = require("./pipeline");
    return pipelineRoutes._getProject ? pipelineRoutes._getProject() : null;
  } catch {
    return null;
  }
}

async function executeTool(name, req) {
  try {
    const port = process.env.PORT || 3000;
    const base = `http://127.0.0.1:${port}/api/pipeline`;
    const headers = { "Content-Type": "application/json" };
    let res, data;

    switch (name) {
      case "check_metadata_score":
        res = await fetch(`${base}/metadata-score`, { headers });
        return await res.json();
      case "check_screenshot_score":
        res = await fetch(`${base}/screenshot-score`, { headers });
        return await res.json();
      case "check_signing_score":
        res = await fetch(`${base}/signing-score`, { headers });
        return await res.json();
      case "check_build_status":
        res = await fetch(`${base}/build/status`, { headers });
        return await res.json();
      case "start_build":
        res = await fetch(`${base}/build/start`, { method: "POST", headers });
        return await res.json();
      case "check_apple_status":
        res = await fetch(`${base}/apple/status`, { headers });
        return await res.json();
      case "generate_apple_jwt":
        res = await fetch(`${base}/apple/generate-jwt`, { method: "POST", headers });
        return await res.json();
      case "check_launch_readiness":
        res = await fetch(`${base}/launch/dashboard`, { headers });
        return await res.json();
      case "run_pipeline":
        res = await fetch(`${base}/run`, { method: "POST", headers });
        return await res.json();
      case "get_project_overview":
        res = await fetch(`${base}/project`, { headers });
        return await res.json();
      default:
        return { error: "Unknown tool: " + name };
    }
  } catch (err) {
    return { error: "Tool execution failed: " + err.message };
  }
}

async function chatCompletion(messages) {
  const res = await fetch(`${OPENAI_BASE}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${OPENAI_KEY}`
    },
    body: JSON.stringify({
      model: "gpt-4o",
      messages,
      tools: TOOLS,
      tool_choice: "auto",
      temperature: 0.3
    })
  });
  return res.json();
}

const conversationHistory = new Map();

router.post("/chat", async (req, res) => {
  try {
    const { message, sessionId } = req.body;
    if (!message) return res.status(400).json({ ok: false, error: "No message" });

    if (!OPENAI_BASE || !OPENAI_KEY) {
      return res.json({ ok: true, reply: "Agent is not configured yet. AI integration needs to be set up.", actions: [] });
    }

    const sid = sessionId || "default";
    if (!conversationHistory.has(sid)) {
      conversationHistory.set(sid, [{ role: "system", content: SYSTEM_PROMPT }]);
    }

    const history = conversationHistory.get(sid);
    history.push({ role: "user", content: message });

    const actions = [];
    let maxIterations = 5;

    while (maxIterations > 0) {
      maxIterations--;
      const completion = await chatCompletion(history);
      const choice = completion.choices?.[0];

      if (!choice) {
        return res.json({ ok: false, error: "No response from AI" });
      }

      const msg = choice.message;
      history.push(msg);

      if (msg.tool_calls && msg.tool_calls.length > 0) {
        for (const tc of msg.tool_calls) {
          const toolName = tc.function.name;
          const result = await executeTool(toolName, req);

          actions.push({ tool: toolName, result });

          history.push({
            role: "tool",
            tool_call_id: tc.id,
            content: JSON.stringify(result)
          });
        }
      } else {
        if (history.length > 30) {
          const system = history[0];
          conversationHistory.set(sid, [system, ...history.slice(-20)]);
        }

        return res.json({
          ok: true,
          reply: msg.content,
          actions
        });
      }
    }

    const lastMsg = history[history.length - 1];
    return res.json({
      ok: true,
      reply: lastMsg.content || "I took several actions. Check the results above.",
      actions
    });

  } catch (err) {
    console.error("Agent error:", err);
    res.status(500).json({ ok: false, error: "Agent error: " + err.message });
  }
});

router.delete("/history", (req, res) => {
  const sid = req.body?.sessionId || "default";
  conversationHistory.delete(sid);
  res.json({ ok: true, message: "Conversation cleared" });
});

module.exports = router;
