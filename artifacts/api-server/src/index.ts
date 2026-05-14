import app from "./app";
import { logger } from "./lib/logger";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

// Log the public URL so we can confirm Stripe webhooks will work
const publicHost = process.env.PUBLIC_URL
  ?? process.env.RAILWAY_PUBLIC_DOMAIN
  ?? process.env.REPLIT_DOMAINS?.split(",")[0];

if (publicHost) {
  logger.info({ webhookUrl: `https://${publicHost}/api/stripe/webhook` }, "Stripe webhook URL ready — configure this in your Stripe dashboard");
} else {
  logger.warn("No PUBLIC_URL / RAILWAY_PUBLIC_DOMAIN set — set one so Stripe webhooks work");
}

app.listen(port, (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }
  logger.info({ port }, "Server listening");
});
