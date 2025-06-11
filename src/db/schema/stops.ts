import {
  pgTable,
  integer,
  text,
  index,
  real,
  jsonb, // Import jsonb
} from "drizzle-orm/pg-core";

export const stops = pgTable(
  "stops",
  {
    id: integer("number").notNull().primaryKey(),
    name: text("name").notNull(),
    lat: real("lat"),
    lon: real("lon"),
    zoneId: text("zone_id"),
    // Change supported_modes to jsonb to store an array of strings
    supportedModes: jsonb("supported_modes").$type<string[]>(),
  },
  (stops) => [index("name_idx").on(stops.name)]
);

export type Stop = typeof stops.$inferSelect;
