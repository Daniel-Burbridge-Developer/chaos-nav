import { pgTable, integer, text, index } from "drizzle-orm/pg-core";

export const routes = pgTable(
  "routes",
  {
    id: text("id").primaryKey().notNull().unique(),
    agencyId: text("agency_id").notNull(),
    shortName: text("short_name"),
    longName: text("long_name"),
    type: integer("type").notNull(),
  },
  (routes) => [
    index("short_name_idx").on(routes.shortName),
    index("long_name_idx").on(routes.longName),
  ]
);

export type Route = typeof routes.$inferSelect;
