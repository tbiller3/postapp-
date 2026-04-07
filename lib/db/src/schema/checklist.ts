import { pgTable, text, serial, integer, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { appsTable } from "./apps";

export const checklistTable = pgTable("checklist", {
  id: serial("id").primaryKey(),
  appId: integer("app_id").notNull().references(() => appsTable.id, { onDelete: "cascade" }),
  label: text("label").notNull(),
  completed: boolean("completed").notNull().default(false),
  category: text("category").notNull().default("General"),
});

export const insertChecklistItemSchema = createInsertSchema(checklistTable).omit({ id: true });
export type InsertChecklistItem = z.infer<typeof insertChecklistItemSchema>;
export type ChecklistItem = typeof checklistTable.$inferSelect;
