import { createInsertSchema } from "drizzle-zod";
import { pgTable, serial, text } from "drizzle-orm/pg-core";
import { z } from "zod/v4";

export const tournamentsTable = pgTable("ascend_tournaments", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  date: text("date_label").notNull(),
  placement: text("placement").notNull(),
  status: text("status").notNull(),
});

export const insertTournamentSchema = createInsertSchema(tournamentsTable).omit(
  { id: true },
);
export type InsertTournament = z.infer<typeof insertTournamentSchema>;
export type Tournament = typeof tournamentsTable.$inferSelect;
