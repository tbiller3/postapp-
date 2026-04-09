import { Router } from "express";
import { eq, asc } from "drizzle-orm";
import { db } from "@workspace/db";
import { conversations, messages } from "@workspace/db";
import { openai } from "@workspace/integrations-openai-ai-server";

const router = Router();

const SYSTEM_PROMPT = `You are an expert App Store submission assistant built into POSTAPP — a tool that helps developers manage their iOS App Store submissions.

You have deep expertise in:
- Apple App Store Review Guidelines (all sections)
- App Store Connect metadata: titles, subtitles, descriptions, keywords, screenshots, icons
- Common rejection reasons and how to fix them
- Privacy policies, data collection declarations, App Privacy labels
- Age ratings and content flags
- Binary uploads, TestFlight, EAS Build, and Xcode workflows
- In-app purchases, subscriptions, and pricing disclosure
- Capacitor, React Native, and web-to-native wrappers
- Minimum iOS version requirements
- Screenshot specifications (6.9", 6.5", 5.5", iPad sizes)
- App icon requirements (1024×1024 PNG, no alpha channel, no rounded corners applied by developer)

Your tone is calm, practical, and developer-friendly. Be concise but thorough. When a developer describes a rejection or issue, give them specific, actionable steps to fix it. When they ask about requirements, quote the relevant guideline number if you know it.

When the user provides context about their app (name, bundle ID, checklist status), use that information to personalize your answers.

Always be encouraging — App Store submission can be frustrating, and you're here to make it less so.`;

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
