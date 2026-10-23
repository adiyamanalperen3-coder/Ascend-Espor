import { createInsertSchema } from "drizzle-zod";
import { integer, pgTable, serial, text } from "drizzle-orm/pg-core";
import { z } from "zod/v4";

export const matchesTable = pgTable("ascend_matches", {
  id: serial("id").primaryKey(),
  opponent: text("opponent").notNull(),
  date: text("date_label").notNull(),
  event: text("event").notNull(),
  a: integer("ascend_score").notNull(),
  b: integer("opponent_score").notNull(),
  result: text("result").notNull(),
});

export const insertMatchSchema = createInsertSchema(matchesTable).omit({
  id: true,
});
export type InsertMatch = z.infer<typeof insertMatchSchema>;
export type Match = typeof matchesTable.$inferSelect;
