import { z } from "zod";

export const SupportedModeZodSchema = z
  .enum(["Bus", "Rail", "School Bus", "Ferry"])
  .describe("Different modes of transport for Transperth");

export const StopSelectZodSchema = z.object({
  id: z.number().describe("Unique identifier for the stop"),
  name: z.string().describe("Name of the stop"),
  lat: z.number().describe("Latitude of the stop for geographical mapping"),
  lon: z.number().describe("Longtitude of the stop for geographical mapping"),
  zoneId: z
    .string()
    .nullable()
    .describe("Zone used for mapping and pricing - I don't use this"),
  supportedModes: z
    .array(SupportedModeZodSchema)
    .describe("differnt types of vehicles that can use this stop"),
});

export type Stop = z.infer<typeof StopSelectZodSchema>;
//Work around as could not create with drizzle-zod due to JsonB
export type NewStop = z.infer<typeof StopSelectZodSchema>;
export type SupportedMode = z.infer<typeof SupportedModeZodSchema>;
