// In your Zod schema file (e.g., 'src/lib/schemas.ts')
import { z } from "zod";

export const ShapePointZodSchema = z.object({
  lat: z.number().describe("Latitude of the Point for geographical mapping"),
  lon: z.number().describe("Longtitude of the Point for geographical mapping"),
  Sequence: z
    .number()
    .describe("which point this is in the sequence of points for the trip"),
});

export const ShapeSelectZodSchema = z.object({
  id: z.number().describe("Unique identifier for the point"),
  points: z
    .array(ShapePointZodSchema)
    .describe("Ordered list of points for this shape"),
});

export type Shape = z.infer<typeof ShapeSelectZodSchema>;
//Work around as could not create with drizzle-zod due to JsonB
export type NewShape = z.infer<typeof ShapeSelectZodSchema>;
export type ShapePoint = z.infer<typeof ShapePointZodSchema>;
