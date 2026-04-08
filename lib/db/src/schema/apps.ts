import { pgTable, text, serial, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const appsTable = pgTable("apps", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  platform: text("platform").notNull().default("iOS"),
  status: text("status").notNull().default("draft"),
  description: text("description"),
  bundleId: text("bundle_id"),
  version: text("version"),
  buildNumber: text("build_number"),
  category: text("category"),
  subtitle: text("subtitle"),
  ageRating: text("age_rating"),
  keywords: text("keywords"),
  supportUrl: text("support_url"),
  privacyPolicyUrl: text("privacy_policy_url"),
  replitUrl: text("replit_url"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertAppSchema = createInsertSchema(appsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertApp = z.infer<typeof insertAppSchema>;
export type App = typeof appsTable.$inferSelect;
