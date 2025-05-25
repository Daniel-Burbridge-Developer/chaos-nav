import { createFileRoute } from "@tanstack/react-router";
import { InteractiveMap } from "./-components/map";

export const Route = createFileRoute("/bus-routes/")({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <div className="p-4">
      <h1 className="text-xl font-bold mb-4">Interactive Bus Map</h1>
      <InteractiveMap
        center={[51.505, -0.09]}
        markers={[
          { position: [51.505, -0.09], label: "Central Stop" },
          { position: [51.51, -0.1], label: "North Stop" },
        ]}
      />
    </div>
  );
}
