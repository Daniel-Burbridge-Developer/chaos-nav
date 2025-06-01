import { sqliteTable, integer, text, index } from 'drizzle-orm/sqlite-core';

export const routes = sqliteTable(
  'routes',
  {
    id: integer('id').primaryKey({ autoIncrement: true }), // Primary key for each record
    route_id: text('route_id').notNull().unique(), // Unique identifier for the route
    agency_id: text('agency_id').notNull(),
    route_short_name: text('route_short_name'),
    route_long_name: text('route_long_name'),
    route_desc: text('route_desc'),
    route_type: integer('route_type').notNull(), // As it's a number in your JSON
    route_url: text('route_url'),
    route_color: text('route_color'),
    route_text_color: text('route_text_color'),
  },
  (routes) => [
    // Indexing `route_id` will be useful for querying individual routes
    index('route_id_idx').on(routes.route_id),
    // Indexing `agency_id` can be useful if you often query routes by agency
    index('agency_id_idx').on(routes.agency_id),
    // Consider indexing route_type if you frequently filter routes by type
    index('route_type_idx').on(routes.route_type),
  ]
);

export type Route = typeof routes.$inferSelect;
