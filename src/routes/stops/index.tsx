import { createFileRoute } from "@tanstack/react-router";
import StopLookup from "./-components/stop-lookup";

export const Route = createFileRoute("/stops/")({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <div>
      <div>
        <StopLookup />
      </div>
    </div>
  );
}
