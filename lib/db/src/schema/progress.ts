import { pgTable, text, json, timestamp } from "drizzle-orm/pg-core";

export const moduleProgressTable = pgTable("module_progress", {
  sessionId: text("session_id").primaryKey(),
  modules: json("modules").notNull().default({}),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export type ModuleProgress = typeof moduleProgressTable.$inferSelect;
