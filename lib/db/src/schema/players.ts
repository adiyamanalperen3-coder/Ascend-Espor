import { createInsertSchema } from "drizzle-zod";
import { integer, pgTable, serial, text } from "drizzle-orm/pg-core";
import { z } from "zod/v4";

export const playersTable = pgTable("ascend_players", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  initials: text("initials").notNull(),
  role: text("role").notNull(),
  matches: integer("matches").notNull().default(0),
  wins: integer("wins").notNull().default(0),
  note: text("note").notNull().default(""),
});

export const insertPlayerSchema = createInsertSchema(playersTable).omit({
  id: true,
});
export type InsertPlayer = z.infer<typeof insertPlayerSchema>;
export type Player = typeof playersTable.$inferSelect;
