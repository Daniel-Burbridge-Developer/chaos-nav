import { z } from "zod";
import { createSelectSchema } from "drizzle-zod";
import { stops } from "@/db/schema/stops";

// Create base schema from drizzle-zod (will skip unsupported fields)
const baseStopSelectZodSchema = createSelectSchema(stops);

// Extend with supported_modes as an array of strings
export const stopSchema = baseStopSelectZodSchema.extend({
  supported_modes: z.array(z.string()).optional(),
});

export type Stop = z.infer<typeof stopSchema>;
export type NewStop = z.infer<typeof stopSchema>; // For create operations
