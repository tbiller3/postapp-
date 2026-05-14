import OpenAI from "openai";

// Support both Replit AI integration vars and standard OPENAI_API_KEY (Railway/other)
const apiKey = process.env.AI_INTEGRATIONS_OPENAI_API_KEY ?? process.env.OPENAI_API_KEY;
const baseURL = process.env.AI_INTEGRATIONS_OPENAI_BASE_URL; // optional on Railway

if (!apiKey) {
  throw new Error(
    "No OpenAI API key found. Set OPENAI_API_KEY (Railway) or AI_INTEGRATIONS_OPENAI_API_KEY (Replit).",
  );
}

export const openai = new OpenAI({
  apiKey,
  ...(baseURL ? { baseURL } : {}),
});
