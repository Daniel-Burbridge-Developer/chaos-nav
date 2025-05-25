import { createFileRoute } from "@tanstack/react-router";
import StopLookup from "./-components/stop-lookup";
import { useState } from "react";
import StopCard from "./-components/stop-card";

export const Route = createFileRoute("/stops/")({
  component: RouteComponent,
});

function RouteComponent() {
  const [stopList, setStopList] = useState<string[]>([]);

  return (
    <div className="min-h-screen bg-gray-600 p-4 md:p-8">
      <div className="max-w-xl mx-auto bg-zinc-700 shadow-md rounded-2xl p-6">
        <h1 className="text-2xl font-bold text-white mb-4 text-center">
          Stop Lookup
        </h1>
        <div>
          <StopLookup
            onFormSubmit={(stop) => setStopList((prev) => [...prev, stop])}
          />
        </div>
        {/* change the key on this, prevent duplicate cards of the same stop, and use stop number as the key */}
        {stopList.length > 0 && (
          <div className="mt-6 space-y-4">
            {stopList.map((stopNumber, index) => (
              <StopCard
                key={`${stopNumber}-${index}`}
                stopNumber={stopNumber}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
