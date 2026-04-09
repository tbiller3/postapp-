import { pgTable, serial, text, timestamp, integer, varchar } from "drizzle-orm/pg-core";

export const submissionCreditsTable = pgTable("submission_credits", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull(),
  projectId: integer("project_id"),
  type: text("type").notNull().default("standard"),
  status: text("status").notNull().default("active"),
  stripePaymentIntentId: varchar("stripe_payment_intent_id"),
  amountPaid: integer("amount_paid"),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  usedAt: timestamp("used_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type SubmissionCredit = typeof submissionCreditsTable.$inferSelect;
export type InsertSubmissionCredit = typeof submissionCreditsTable.$inferInsert;
