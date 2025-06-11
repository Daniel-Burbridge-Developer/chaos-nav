import { createSelectSchema } from "drizzle-zod";
import { routes } from "~/db/schema/";

export const routeSchema = createSelectSchema(routes);

export const routeInsertSchema = routeSchema.omit({ id: true });

export type Route = typeof routeSchema.type;
export type NewRoute = typeof routeInsertSchema.type;
