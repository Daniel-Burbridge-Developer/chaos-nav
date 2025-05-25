import { createFileRoute } from "@tanstack/react-router";
import StopLookup from "./-components/stop-lookup";
import { useState } from "react";
import StopCard from "./-components/stop-card";
import { X } from "lucide-react";

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
            onFormSubmit={(stop) =>
              setStopList((prev) =>
                prev.includes(stop) ? prev : [...prev, stop]
              )
            }
          />
        </div>
        {stopList.length > 0 && (
          <div className="mt-6 space-y-4">
            {stopList.map((stopNumber) => (
              <div key={stopNumber} className="relative">
                <button
                  className="absolute top-2 right-2 z-10 p-1 rounded-full bg-zinc-800 hover:bg-zinc-600 text-white"
                  aria-label="Remove stop"
                  onClick={() =>
                    setStopList((prev) => prev.filter((s) => s !== stopNumber))
                  }
                >
                  <X size={16} />
                </button>
                <StopCard stopNumber={stopNumber} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
