import { pgTable, integer, text, index, jsonb } from "drizzle-orm/pg-core";

// THIS IS NOT USING DRIZZLE-ZOD, IF THIS CHANGES, YOU MUST CHANGE THE ZOD SCHEMA AS WELL. THIS IS DUE TO THE JSONB Not Transferring.

export type StopPoint = {
  id: string;
  arrivalTime: string;
  Sequence: number;
};

export const trips = pgTable(
  "trips",
  {
    id: text("id").notNull().primaryKey(),
    routeId: text("route_id").notNull(),
    serviceId: text("service_id").notNull(),
    directionId: integer("direction_id"),
    tripHeadsign: text("trip_headsign"),
    shapeId: text("shape_id"),
    stops: jsonb("stops").$type<StopPoint[]>(),
  },
  (trips) => [
    index("route_id_idx").on(trips.routeId),
    index("route_service_idx").on(trips.routeId, trips.serviceId),
    index("shape_id_idx").on(trips.shapeId),
  ]
);
