import {
  sqliteTable,
  integer,
  text,
  index,
  real,
} from "drizzle-orm/sqlite-core";

export const stops = sqliteTable(
  "stops",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    name: text("name").notNull(),
    number: text("number").notNull(),
    // New columns added below
    lat: real("lat"), // Use 'real' for floating-point numbers
    lon: real("lon"), // Use 'real' for floating-point numbers
    zone_id: integer("zone_id"), // Use 'integer' for zone_id
  },
  (stops) => [
    // Existing index on number
    index("number_idx").on(stops.number),
    // Add a new index on name
    index("name_idx").on(stops.name),
  ]
);

export type Stop = typeof stops.$inferSelect;
