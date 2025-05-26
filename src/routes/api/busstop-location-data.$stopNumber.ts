import { json } from "@tanstack/react-start";
import { createAPIFileRoute } from "@tanstack/react-start/api";
import { db } from "~/db/db";
import { stops } from "~/db/schema/stops";
import { eq } from "drizzle-orm";

export const APIRoute = createAPIFileRoute(
  "/api/busstop-location-data/$stopNumber"
)({
  GET: async ({ params }) => {
    const stopNumber = params.stopNumber;
    const result = await db
      .select()
      .from(stops)
      .where(eq(stops.number, stopNumber))
      .limit(1);

    if (!result[0]) {
      return json({ error: "Stop not found" }, { status: 404 });
    }

    return json(result[0]);
  },
});
