import { pgTable, text, serial, timestamp, integer, boolean, json } from "drizzle-orm/pg-core";
import { appsTable } from "./apps";

export const wrapConfigsTable = pgTable("wrap_configs", {
  id: serial("id").primaryKey(),
  appId: integer("app_id").notNull().references(() => appsTable.id, { onDelete: "cascade" }),
  webUrl: text("web_url").notNull(),
  bundleId: text("bundle_id").notNull(),
  appName: text("app_name").notNull(),
  minIosVersion: text("min_ios_version").notNull().default("15.0"),
  backgroundColor: text("background_color").notNull().default("#000000"),
  statusBarStyle: text("status_bar_style").notNull().default("lightContent"),
  allowNavigation: json("allow_navigation").$type<string[]>().default([]),
  permissions: json("permissions").$type<string[]>().default([]),
  codemagicAppId: text("codemagic_app_id"),
  githubRepoFullName: text("github_repo_full_name"),
  lastBuildId: text("last_build_id"),
  lastBuildStatus: text("last_build_status"),
  lastBuiltAt: timestamp("last_built_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export type WrapConfig = typeof wrapConfigsTable.$inferSelect;
export type InsertWrapConfig = typeof wrapConfigsTable.$inferInsert;
