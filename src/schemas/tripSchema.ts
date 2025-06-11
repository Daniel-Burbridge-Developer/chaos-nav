import { z } from "zod";

export const StopPointZodSchema = z.object({
  id: z
    .string()
    .describe("ID of the stop associated with this stopSequence in the trip"),
  arrivalTime: z
    .string()
    .describe(
      "the scheduled arrival time for this stop, I don't currently use this"
    ),
  Sequence: z
    .number()
    .describe("which stop this is in the sequence of stops for the trip"),
});

export const TripSelectZodSchema = z.object({
  id: z.string().describe("Unique identifier for the trip"),
  routeId: z.string().describe("Identifier for the route this trip belongs to"),
  serviceId: z
    .string()
    .describe(
      "Identifier for the service schedule of this trip - I don't currently use this"
    ),
  directionId: z
    .number()
    .nullable()
    .optional()
    .describe("Direction of travel for the trip, if applicable (0 or 1)"),
  tripHeadsign: z
    .string()
    .nullable()
    .optional()
    .describe(
      "Headsign or display name for the trip, represents the destination"
    ),
  shapeId: z
    .string()
    .nullable()
    .optional()
    .describe("Identifier for the shape (path) of the trip"),
  stops: z
    .array(StopPointZodSchema)
    .describe("Ordered list of stops for this trip"),
});

export type Trip = z.infer<typeof TripSelectZodSchema>;
//Work around as could not create with drizzle-zod due to JsonB
export type NewTrip = z.infer<typeof TripSelectZodSchema>;
export type TripStop = z.infer<typeof StopPointZodSchema>;
