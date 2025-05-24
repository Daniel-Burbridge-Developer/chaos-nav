import { createFileRoute } from "@tanstack/react-router";
import StopLookup from "./-components/stop-lookup";
import { useState } from "react";
import { Stop } from "~/db/schema/stops";

export const Route = createFileRoute("/stops/")({
  component: RouteComponent,
});

function RouteComponent() {
  const [lookupResult, setLookupResult] = useState<Stop | null>(null);

  return (
    <div>
      <div>
        <StopLookup onLookupResult={setLookupResult} />
      </div>
      {lookupResult && (
        <pre className="mt-4 bg-gray-100 p-2 rounded">
          {JSON.stringify(lookupResult, null, 2)}
        </pre>
      )}
    </div>
  );
}
