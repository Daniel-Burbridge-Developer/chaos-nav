// src/routes/stops/-components/stop-card.tsx

import React from 'react';
// Assuming the Stop type is either globally available or defined here for clarity.
// In a larger project, you'd typically import this from a shared types/schema file.
interface Stop {
  id: number; // Corresponds to 'number' in your schema, but often referred to as 'id'
  name: string;
  lat: number | null;
  lon: number | null;
  zone_id: string | null;
  supported_modes: string[] | null;
}

type StopCardProps = {
  stop: Stop; // Now accepts the full Stop object
};

// --- StopCard component ---

const StopCard = React.memo(function StopCard({ stop }: StopCardProps) {
  // No need for useQuery calls here anymore, as the stop data is passed directly
  // through props from the parent RouteComponent.
  // The previous 'stopData' (bus arrival info) and 'stopName' fetches are removed.

  if (!stop) {
    // Basic check if stop prop is somehow null/undefined (though it should be a Stop object)
    return (
      <div className='p-4 bg-gray-100 rounded-xl text-red-500'>
        Error: Stop data missing.
      </div>
    );
  }

  return (
    <div className='border rounded-xl p-4 shadow bg-white'>
      <h3 className='text-lg font-semibold text-gray-800 mb-2 flex items-center gap-2'>
        Stop {stop.id}
        {stop.name ? (
          ` – ${stop.name}`
        ) : (
          <span className='text-red-500'> - Name not available</span>
        )}
        {/* Removed isFetching indicator as no data is being fetched directly here */}
      </h3>
      <div className='text-sm text-gray-600 mb-2'>
        {stop.lat && stop.lon
          ? `Lat: ${stop.lat.toFixed(4)}, Lon: ${stop.lon.toFixed(4)}`
          : 'Location unknown'}
      </div>
      {stop.zone_id && (
        <div className='text-sm text-gray-600 mb-2'>Zone: {stop.zone_id}</div>
      )}
      {stop.supported_modes && stop.supported_modes.length > 0 && (
        <div className='text-sm text-gray-600'>
          Modes: {stop.supported_modes.join(', ')}
        </div>
      )}

      {/* The section below for 'bus.busNumber', 'bus.destination', 'bus.timeUntilArrival'
          and 'bus.liveStatus' was for live bus arrival data.
          Since we removed the API call for that data, this section is commented out.
          If you need this functionality, a new API endpoint for live arrivals at a stop
          and a separate data fetching mechanism would be required.
      */}
      {/*
      <ul className="divide-y mt-4">
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
      */}
    </div>
  );
});

export default StopCard;
