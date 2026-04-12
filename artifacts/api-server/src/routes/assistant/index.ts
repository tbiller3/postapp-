import { Router } from "express";
import { eq, asc } from "drizzle-orm";
import { db } from "@workspace/db";
import { conversations, messages } from "@workspace/db";
import { openai } from "@workspace/integrations-openai-ai-server";
import { POSTAPP_SKILLS } from "./postapp-skills.js";

const router = Router();

const SYSTEM_PROMPT = `You are the POSTAPP Agent — an AI co-pilot embedded directly inside POSTAPP, a service that automates iOS App Store submissions end-to-end.

You are not a generic assistant. You are purpose-built for one job: getting apps submitted to the Apple App Store, fast and without errors.

${POSTAPP_SKILLS}

When the user provides context about their app (name, bundle ID, checklist status, pending items), use it to give specific, tailored answers — not generic advice.

Respond in plain conversational English. No unnecessary headers or bullet walls unless the answer genuinely needs structure. Be direct, be fast, be right.`;

router.post("/agent/chat", async (req, res): Promise<void> => {
  const { message, appContext } = req.body as {
    message: string;
    appContext?: {
      appName?: string;
      bundleId?: string;
      checklistTotal?: number;
      checklistDone?: number;
      pendingItems?: string[];
    };
  };

  if (!message?.trim()) {
    res.status(400).json({ error: "Message is required" });
    return;
  }

  try {
    let contextBlock = "";
    if (appContext?.appName) {
      const pending = appContext.pendingItems?.length
        ? `\nPending checklist items:\n${appContext.pendingItems.map((i) => `- ${i}`).join("\n")}`
        : "";
      contextBlock = `\n\n[Current app context: "${appContext.appName}" (${appContext.bundleId || "no bundle ID"}), ${appContext.checklistDone ?? 0}/${appContext.checklistTotal ?? 0} checklist items complete.${pending}]`;
    }

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      max_completion_tokens: 1024,
      messages: [
        { role: "system", content: SYSTEM_PROMPT + contextBlock },
        { role: "user", content: message },
      ],
    });

    const reply = completion.choices[0]?.message?.content ?? "Sorry, I couldn't generate a response.";
    res.json({ ok: true, reply, actions: [] });
  } catch (err) {
    console.error("Agent chat error:", err);
    res.status(500).json({ error: "Assistant unavailable. Please try again." });
  }
});

router.post("/assistant/conversations", async (req, res): Promise<void> => {
  try {
    const { title } = req.body as { title?: string };
    const [conv] = await db
      .insert(conversations)
      .values({ title: title || "App Store Assistant" })
      .returning();
    res.json(conv);
  } catch (err) {
    res.status(500).json({ error: "Failed to create conversation" });
  }
});

router.get("/assistant/conversations/:id/messages", async (req, res): Promise<void> => {
  try {
    const convId = parseInt(req.params.id, 10);
    const msgs = await db
      .select()
      .from(messages)
      .where(eq(messages.conversationId, convId))
      .orderBy(asc(messages.createdAt));
    res.json(msgs);
  } catch (err) {
    res.status(500).json({ error: "Failed to load messages" });
  }
});

router.post("/assistant/conversations/:id/messages", async (req, res): Promise<void> => {
  const convId = parseInt(req.params.id, 10);
  const { content, appContext } = req.body as {
    content: string;
    appContext?: {
      appName?: string;
      bundleId?: string;
      platform?: string;
      checklistTotal?: number;
      checklistDone?: number;
      pendingItems?: string[];
    };
  };

  if (!content?.trim()) {
    res.status(400).json({ error: "Message content is required" });
    return;
  }

  try {
    await db.insert(messages).values({
      conversationId: convId,
      role: "user",
      content,
    });

    const history = await db
      .select()
      .from(messages)
      .where(eq(messages.conversationId, convId))
      .orderBy(asc(messages.createdAt));

    let contextBlock = "";
    if (appContext?.appName) {
      const pending = appContext.pendingItems?.length
        ? `\nPending checklist items:\n${appContext.pendingItems.map((i) => `- ${i}`).join("\n")}`
        : "";
      contextBlock = `\n\n[Current app context: "${appContext.appName}" (${appContext.bundleId || "no bundle ID"}), ${appContext.checklistDone ?? 0}/${appContext.checklistTotal ?? 0} checklist items complete.${pending}]`;
    }

    const chatMessages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [
      { role: "system", content: SYSTEM_PROMPT + contextBlock },
      ...history.slice(0, -1).map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      })),
      { role: "user", content },
    ];

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    let fullResponse = "";

    const stream = await openai.chat.completions.create({
      model: "gpt-5.2",
      max_completion_tokens: 8192,
      messages: chatMessages,
      stream: true,
    });

    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta?.content;
      if (delta) {
        fullResponse += delta;
        res.write(`data: ${JSON.stringify({ content: delta })}\n\n`);
      }
    }

    await db.insert(messages).values({
      conversationId: convId,
      role: "assistant",
      content: fullResponse,
    });

    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    res.end();
  } catch (err) {
    console.error("Assistant error:", err);
    if (!res.headersSent) {
      res.status(500).json({ error: "Assistant failed" });
    } else {
      res.write(`data: ${JSON.stringify({ error: "Stream failed" })}\n\n`);
      res.end();
    }
  }
});

export default router;
