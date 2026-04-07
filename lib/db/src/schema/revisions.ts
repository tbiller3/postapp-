import { pgTable, text, serial, timestamp, integer, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { appsTable } from "./apps";

export const revisionsTable = pgTable("revisions", {
  id: serial("id").primaryKey(),
  appId: integer("app_id").notNull().references(() => appsTable.id, { onDelete: "cascade" }),
  note: text("note").notNull(),
  source: text("source").notNull().default("Apple Review"),
  resolved: boolean("resolved").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertRevisionSchema = createInsertSchema(revisionsTable).omit({ id: true, createdAt: true });
export type InsertRevision = z.infer<typeof insertRevisionSchema>;
export type Revision = typeof revisionsTable.$inferSelect;
