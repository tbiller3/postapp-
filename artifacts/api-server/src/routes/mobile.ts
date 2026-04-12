import { Router, type IRouter } from "express";
import jwt from "jsonwebtoken";
import { openai } from "@workspace/integrations-openai-ai-server";
import { POSTAPP_SKILLS } from "./assistant/postapp-skills.js";

const router: IRouter = Router();

function normalizePEM(raw: string): string {
  let pk = raw.replace(/\\n/g, "\n").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  pk = pk.replace(/-----BEGIN PRIVATE KEY-----/g, "").replace(/-----END PRIVATE KEY-----/g, "");
  pk = pk.replace(/\s+/g, "");
  const lines: string[] = [];
  for (let i = 0; i < pk.length; i += 64) lines.push(pk.substring(i, i + 64));
  return "-----BEGIN PRIVATE KEY-----\n" + lines.join("\n") + "\n-----END PRIVATE KEY-----";
}

function makeToken(issuerId: string, keyId: string, privateKey: string): string {
  return jwt.sign({}, normalizePEM(privateKey), {
    algorithm: "ES256",
    expiresIn: "20m",
    issuer: issuerId,
    audience: "appstoreconnect-v1",
    header: { alg: "ES256", kid: keyId, typ: "JWT" },
  });
}

const ASC = "https://api.appstoreconnect.apple.com/v1";

router.get("/mobile/config", (_req, res): void => {
  res.json({
    codemagicToken: process.env.CODEMAGIC_API_TOKEN || "",
    issuerId: process.env.APPLE_ISSUER_ID || "",
    keyId: process.env.APPLE_KEY_ID || "",
    privateKey: process.env.APPLE_PRIVATE_KEY || "",
  });
});

router.post("/mobile/proxy", async (req, res): Promise<void> => {
  const { issuerId, keyId, privateKey, method = "GET", path, body: reqBody } = req.body;

  if (!issuerId || !keyId || !privateKey || !path) {
    res.status(400).json({ error: "Missing credentials or path" });
    return;
  }

  try {
    const token = makeToken(issuerId, keyId, privateKey);
    const url = path.startsWith("http") ? path : `${ASC}${path}`;

    const fetchOpts: RequestInit = {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    };
    if (reqBody && method !== "GET") {
      fetchOpts.body = JSON.stringify(reqBody);
    }

    const appleRes = await fetch(url, fetchOpts);
    const text = await appleRes.text();

    res.status(appleRes.ok ? 200 : appleRes.status).json(
      text ? JSON.parse(text) : {}
    );
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/mobile/build", async (req, res): Promise<void> => {
  const { codemagicToken, appId, workflowId = "ios-release", branch = "main" } = req.body;

  if (!codemagicToken || !appId) {
    res.status(400).json({ error: "Missing codemagicToken or appId" });
    return;
  }

  try {
    const r = await fetch("https://api.codemagic.io/builds", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-auth-token": codemagicToken },
      body: JSON.stringify({ appId, workflowId, branch }),
    });
    const data = await r.json();
    res.status(r.ok ? 200 : r.status).json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/mobile/build/:buildId", async (req, res): Promise<void> => {
  const { codemagicToken } = req.query;
  const { buildId } = req.params;

  if (!codemagicToken) {
    res.status(400).json({ error: "Missing codemagicToken" });
    return;
  }

  try {
    const r = await fetch(`https://api.codemagic.io/builds/${buildId}`, {
      headers: { "x-auth-token": codemagicToken as string },
    });
    const data = await r.json();
    res.status(r.ok ? 200 : r.status).json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/mobile/screenshot", async (req, res): Promise<void> => {
  const { issuerId, keyId, privateKey, setId, fileName, fileData } = req.body;

  if (!issuerId || !keyId || !privateKey || !setId || !fileName || !fileData) {
    res.status(400).json({ error: "Missing required fields" });
    return;
  }

  try {
    const token = makeToken(issuerId, keyId, privateKey);
    const h = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };

    const buf = Buffer.from(fileData, "base64");
    const fileSize = buf.length;

    const createRes = await fetch(`${ASC}/appScreenshots`, {
      method: "POST",
      headers: h,
      body: JSON.stringify({
        data: {
          type: "appScreenshots",
          attributes: { fileName, fileSize },
          relationships: { appScreenshotSet: { data: { type: "appScreenshotSets", id: setId } } },
        },
      }),
    });
    const createData: any = await createRes.json();

    if (!createRes.ok) {
      res.status(createRes.status).json(createData);
      return;
    }

    const ssId = createData.data.id;
    const ops = createData.data.attributes.uploadOperations || [];

    for (const op of ops) {
      const chunk = buf.slice(op.offset, op.offset + op.length);
      const uploadHeaders: Record<string, string> = {};
      for (const rh of op.requestHeaders || []) uploadHeaders[rh.name] = rh.value;
      await fetch(op.url, { method: op.method, headers: uploadHeaders, body: chunk });
    }

    const crypto = await import("crypto");
    const checksum = crypto.createHash("md5").update(buf).digest("base64");

    const commitRes = await fetch(`${ASC}/appScreenshots/${ssId}`, {
      method: "PATCH",
      headers: h,
      body: JSON.stringify({
        data: {
          type: "appScreenshots",
          id: ssId,
          attributes: { uploaded: true, sourceFileChecksum: checksum },
        },
      }),
    });

    const commitData = await commitRes.json();
    res.status(commitRes.ok ? 200 : commitRes.status).json(commitData);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

const MOBILE_AGENT_PROMPT = `You are the POSTAPP Agent running inside the POSTAPP iOS app. You are talking directly to someone who is trying to get their iOS app onto the Apple App Store. They are not technical — explain everything in plain language. Be concise, warm, and action-oriented.

${POSTAPP_SKILLS}`;

router.post("/mobile/chat", async (req, res): Promise<void> => {
  const { message, history = [], appContext } = req.body as {
    message: string;
    history?: Array<{ role: "user" | "assistant"; content: string }>;
    appContext?: { appName?: string; step?: string };
  };

  if (!message?.trim()) {
    res.status(400).json({ error: "Message required" });
    return;
  }

  try {
    let contextNote = "";
    if (appContext?.appName) contextNote = `\n\n[User is currently working on: "${appContext.appName}"${appContext.step ? `, at step: ${appContext.step}` : ""}]`;

    const messages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [
      { role: "system", content: MOBILE_AGENT_PROMPT + contextNote },
      ...history.slice(-10),
      { role: "user", content: message },
    ];

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      max_completion_tokens: 600,
      messages,
    });

    const reply = completion.choices[0]?.message?.content ?? "Sorry, I couldn't respond right now.";
    res.json({ ok: true, reply });
  } catch (err: any) {
    console.error("Mobile chat error:", err);
    res.status(500).json({ error: "Agent unavailable. Try again." });
  }
});

export default router;
