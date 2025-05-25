import { json } from "@tanstack/react-start";
import { createAPIFileRoute } from "@tanstack/react-start/api";
import busnumbers_stops from "@/transperth_data/bus_routes.json";

export const APIRoute = createAPIFileRoute("/api/bus-route/$busNumber")({
  GET: async ({ params }) => {
    const { busNumber } = params;

    if (!busNumber) {
      return json({ error: "Missing bus number" }, { status: 400 });
    }

    // Find the bus stop numbers for the given bus number
    // gross
    const stops = busnumbers_stops[busNumber as keyof typeof busnumbers_stops];

    if (!stops) {
      return json({ error: "Bus number not found" }, { status: 404 });
    }

    return json({ stops });
  },
});
