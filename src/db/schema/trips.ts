import { sqliteTable, integer, text, index } from 'drizzle-orm/sqlite-core';

export const trips = sqliteTable(
  'trips',
  {
    id: integer('id').primaryKey({ autoIncrement: true }), // A primary key for each record
    route_id: text('route_id').notNull(), // Corresponds to the 'route_id' in your JSON
    service_id: text('service_id').notNull(), // Corresponds to the 'service_id'
    trip_id: text('trip_id').notNull().unique(), // Unique identifier for each trip
    direction_id: integer('direction_id'), // Use integer for direction (0 or 1)
    trip_headsign: text('trip_headsign'), // Text for the trip's destination
    shape_id: text('shape_id'), // Reference to a shape definition
  },
  (trips) => [
    // Indexing `trip_id` for efficient unique lookups
    index('trip_id_idx').on(trips.trip_id),
    // Indexing `route_id` for querying trips belonging to a specific route
    index('route_id_idx').on(trips.route_id),
    // Consider a composite index if you frequently query by route and service
    index('route_service_idx').on(trips.route_id, trips.service_id),
    // Indexing `shape_id` if you often look up trips by their associated shape
    index('shape_id_idx').on(trips.shape_id),
  ]
);

export type Trip = typeof trips.$inferSelect;
