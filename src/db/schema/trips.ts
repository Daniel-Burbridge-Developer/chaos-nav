// src/db/schema/trips.ts
import { pgTable, integer, text, index, jsonb } from 'drizzle-orm/pg-core'; // Make sure to import 'jsonb'

// Define the TripStop type here, as it's now an integral part of the trips table's JSONB column
export type TripStop = {
  id: string; // Corresponds to stop_id in original RawStopTimeJson
  arrivalTime: string; // Corresponds to arrival_time in original RawStopTimeJson
  stopSequence: number; // Corresponds to stop_sequence in original RawStopTimeJson
};

export const trips = pgTable(
  'trips',
  {
    id: text('id').notNull().primaryKey(),
    route_id: text('route_id').notNull(),
    service_id: text('service_id').notNull(),
    direction_id: integer('direction_id'),
    trip_headsign: text('trip_headsign'),
    shape_id: text('shape_id'),
    stops: jsonb('stops').$type<TripStop[]>(),
  },
  (trips) => [
    index('route_id_idx').on(trips.route_id),
    index('route_service_idx').on(trips.route_id, trips.service_id),
    index('shape_id_idx').on(trips.shape_id),
  ]
);

export type Trip = typeof trips.$inferSelect;
