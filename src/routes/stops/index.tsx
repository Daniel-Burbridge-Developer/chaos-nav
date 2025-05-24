import { createFileRoute } from "@tanstack/react-router";
import StopLookup from "./-components/stop-lookup";
import { useState } from "react";

export const Route = createFileRoute("/stops/")({
  component: RouteComponent,
});

function RouteComponent() {
  const [stopList, setStopList] = useState<string[]>([]);

  return (
    <div>
      <div>
        <StopLookup onFormSubmit={(stop) => setStopList([...stopList, stop])} />
      </div>
      {stopList.length > 0 && (
        <div className="mt-4">
          <h2 className="text-lg font-semibold">Selected Stops:</h2>
          <ul className="list-disc pl-5">
            {stopList.map((stop, index) => (
              <li key={index} className="text-gray-700">
                {stop}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
