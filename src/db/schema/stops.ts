import { sqliteTable, integer, text, index } from "drizzle-orm/sqlite-core";

export const stops = sqliteTable(
  "stops",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    name: text("name").notNull(),
    number: text("number").notNull(),
  },
  (stops) => [
    // Existing index on number
    index("number_idx").on(stops.number),
    // Add a new index on name
    index("name_idx").on(stops.name),
  ]
);

export type Stop = typeof stops.$inferSelect;
