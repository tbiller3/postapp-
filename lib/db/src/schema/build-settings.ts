import { pgTable, text, serial, timestamp } from "drizzle-orm/pg-core";

export const buildSettingsTable = pgTable("build_settings", {
  id: serial("id").primaryKey(),
  codemagicApiKey: text("codemagic_api_key"),
  githubToken: text("github_token"),
  appStoreKeyId: text("app_store_key_id"),
  appStoreIssuerId: text("app_store_issuer_id"),
  appStorePrivateKey: text("app_store_private_key"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export type BuildSettings = typeof buildSettingsTable.$inferSelect;
export type InsertBuildSettings = typeof buildSettingsTable.$inferInsert;
