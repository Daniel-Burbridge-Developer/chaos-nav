import { useQuery } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";
import { db } from "~/db/db";
import { stops } from "~/db/schema/stops";
import { eq } from "drizzle-orm";
import { CarTaxiFront } from "lucide-react";
import React from "react";

type StopCardProps = {
  stopNumber: string;
};

export const getStopNameByNumber = createServerFn()
  .validator((data: string) => data)
  .handler(async (ctx) => {
    console.log(ctx.data, "is being resolved");
    const result = await db
      .select({ name: stops.name })
      .from(stops)
      .where(eq(stops.number, ctx.data))
      .limit(1);

    return result?.[0]?.name ?? null;
  });

const resolveStopLookup = async (stopNumber: string) => {
  const response = await fetch(`/api/bus-stop-lookup/${stopNumber}`);
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  const json = await response.json();
  return json.data;
};

// --- StopCard component ---

const StopCard = React.memo(function StopCard({ stopNumber }: StopCardProps) {
  const {
    data: stopData,
    error,
    isLoading: isStopDataLoading,
    isFetching,
  } = useQuery({
    queryKey: ["stopData", stopNumber],
    queryFn: () => resolveStopLookup(stopNumber),
    refetchInterval: 30000, // 30 seconds
  });

  const { data: stopName, isLoading: isStopNameLoading } = useQuery({
    queryKey: ["stopName", stopNumber],
    queryFn: () => getStopNameByNumber({ data: stopNumber }),
    staleTime: 1000 * 60 * 60, // 1 hour
  });

  if (isStopDataLoading)
    return <div className="p-4 bg-gray-100 rounded-xl">Loading...</div>;
  if (error)
    return <div className="text-red-500">Error loading stop {stopNumber}</div>;

  return (
    <div className="border rounded-xl p-4 shadow bg-white">
      <h3 className="text-lg font-semibold text-gray-800 mb-2 flex items-center gap-2">
        Stop {stopNumber}
        {!isStopNameLoading ? (
          stopName ? (
            ` – ${stopName}`
          ) : (
            <span className="text-red-500"> - unable to locate stop</span>
          )
        ) : (
          <span className="text-gray-500"> - loading</span>
        )}
        {isFetching && (
          <CarTaxiFront className="animate-spin h-4 w-4 text-gray-400 ml-2" />
        )}
      </h3>
      <ul className="divide-y">
        {stopData?.map((bus: any, i: number) => (
          <li key={i} className="py-2 flex justify-between items-center">
            <div>
              <div className="font-medium">
                {bus.busNumber} → {bus.destination}
              </div>
              <div className="text-sm text-gray-500">
                {bus.timeUntilArrival}
              </div>
            </div>
            {bus.liveStatus && (
              <span className="text-green-600 text-sm font-semibold">Live</span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
});

export default StopCard;
