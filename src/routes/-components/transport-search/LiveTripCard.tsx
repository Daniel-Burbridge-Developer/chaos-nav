// src/components/transport-search/LiveTripCard.tsx
import { Trip } from '~/db/schema/trips';
import { useLiveTrips } from '~/hooks/use-live-trips';
import { useEffect, useMemo, useCallback } from 'react';

interface LiveTripItemProps {
  trip: Trip;
  liveBusNumber: string; // <-- NEW PROP: The bus number from the RouteCard
  onLiveStatusUpdate: (tripId: string, isLive: boolean) => void;
}

const LiveTripCard: React.FC<LiveTripItemProps> = ({
  trip,
  liveBusNumber, // <-- DESTRUCTURE NEW PROP
  onLiveStatusUpdate,
}) => {
  // --- Logging for initial render and prop values ---
  console.log(
    `%c[LiveTripCard - Render] Trip ID: ${trip.id}, Headsign: "${trip.trip_headsign}", Trip's route_id: "${trip.route_id}", LiveBusNumber (from parent route): "${liveBusNumber}"`,
    'color: #007bff; font-weight: bold;'
  );

  const firstStopId = trip.stops?.[0]?.id ?? '';
  console.log(
    `%c[LiveTripCard - Render] Trip ID: ${trip.id} - Determined firstStopId: "${firstStopId}"`,
    'color: #007bff;'
  );

  const { data: liveData, isLoading, isError } = useLiveTrips(firstStopId);

  // --- Filtering Logic with Detailed Logs ---
  const relevantLiveData = useMemo(() => {
    if (!liveData) {
      console.log(
        `%c[LiveTripCard - Filter] Trip ID: ${trip.id} - liveData is null/undefined.`,
        'color: #888;'
      );
      return [];
    }

    console.log(
      `%c[LiveTripCard - Filter] Trip ID: ${trip.id} - Starting filter process.`,
      'color: #28a745; font-weight: bold;'
    );
    console.log(
      `%c[LiveTripCard - Filter]   Matching against: LiveBusNumber: "${liveBusNumber}", Trip Headsign: "${trip.trip_headsign}"`,
      'color: #28a745;'
    );
    console.log(
      `%c[LiveTripCard - Filter]   Raw liveData received (${liveData.length} items):`,
      'color: #28a745;',
      liveData
    );

    const filtered = liveData.filter((data) => {
      // Log individual data points for comparison
      console.log(
        `%c[LiveTripCard - Filter Item] Comparing live item: Bus "${data.busNumber}" to "${data.destination}" (Live: ${data.liveStatus})`,
        'color: #6c757d;'
      );

      // *** THE CRITICAL CHANGE IS HERE ***
      // Compare liveData.busNumber with the new liveBusNumber prop
      const busNumberMatch = data.busNumber === liveBusNumber;
      const destinationMatch = data.destination === trip.trip_headsign;

      console.log(
        `%c[LiveTripCard - Filter Item]   Match Check for Trip ID: ${trip.id}:`,
        'color: #6c757d;'
      );
      console.log(
        `%c[LiveTripCard - Filter Item]     Bus Number (live vs prop): "${data.busNumber}" === "${liveBusNumber}" => ${busNumberMatch}`,
        'color: #6c757d;'
      );
      console.log(
        `%c[LiveTripCard - Filter Item]     Destination (live vs trip.headsign): "${data.destination}" === "${trip.trip_headsign}" => ${destinationMatch}`,
        'color: #6c757d;'
      );

      if (busNumberMatch && destinationMatch) {
        console.log(
          `%c[LiveTripCard - Filter Item]     --> MATCH FOUND for Trip ID: ${trip.id}!`,
          'color: #ffc107; font-weight: bold;'
        );
      }

      return busNumberMatch && destinationMatch;
    });
    console.log(
      `%c[LiveTripCard - Filter] Trip ID: ${trip.id} - Filtered relevantLiveData length: ${filtered.length}`,
      'color: #28a745; font-weight: bold;',
      filtered
    );
    return filtered;
  }, [liveData, liveBusNumber, trip.trip_headsign, trip.id]); // Dependencies updated

  // --- useEffect for useLiveTrips status logging ---
  useEffect(() => {
    if (isLoading) {
      console.log(
        `%c[LiveTripCard - Hook Status] Trip ID: ${trip.id} - Live data is loading...`,
        'color: #ff9800;'
      );
    } else if (isError) {
      console.error(
        `%c[LiveTripCard - Hook Status] Trip ID: ${trip.id} - Error fetching live data.`,
        'color: #dc3545;'
      );
    } else if (liveData) {
      console.log(
        `%c[LiveTripCard - Hook Status] Trip ID: ${trip.id} - Raw live data received:`,
        'color: #17a2b8;',
        liveData
      );
    }
  }, [isLoading, isError, liveData, trip.id]);

  // --- useEffect for updating parent's live status ---
  useEffect(() => {
    const isCurrentlyLive = (relevantLiveData?.length ?? 0) > 0;
    console.log(
      `%c[LiveTripCard - Status Update] Trip ID: ${trip.id} - useEffect updating live status to: ${isCurrentlyLive}. Relevant data length: ${relevantLiveData?.length ?? 0}`,
      'color: #6f42c1; font-weight: bold;'
    );
    onLiveStatusUpdate(trip.id, isCurrentlyLive);
  }, [relevantLiveData, trip.id, onLiveStatusUpdate]);

  // --- Render Logic ---
  if (isLoading) {
    console.log(
      `%c[LiveTripCard - Render] Trip ID: ${trip.id} - Displaying loading state.`,
      'color: #ffc107;'
    );
    return (
      <p className='text-xs text-gray-400'>
        Loading live data for {trip.trip_headsign}...
      </p>
    );
  }
  if (isError) {
    console.log(
      `%c[LiveTripCard - Render] Trip ID: ${trip.id} - Displaying error state.`,
      'color: #dc3545;'
    );
    return (
      <p className='text-xs text-red-400'>
        Error fetching live data for {trip.trip_headsign}.
      </p>
    );
  }

  const hasLiveData = (relevantLiveData?.length ?? 0) > 0;
  console.log(
    `%c[LiveTripCard - Render] Trip ID: ${trip.id} - Final hasLiveData (relevant): ${hasLiveData}`,
    hasLiveData
      ? 'color: #28a745; font-weight: bold;'
      : 'color: #dc3545; font-weight: bold;'
  );

  return (
    <div className='ml-2 mb-1 border-l-2 pl-2 border-gray-200'>
      <p className='text-sm'>
        <strong>To:</strong>{' '}
        <span className='font-medium'>{trip.trip_headsign}</span>
      </p>
      <p className='text-xs text-gray-500'>Stops: {trip.stops?.length ?? 0}</p>
      <p className='text-xs'>
        Live Status for this trip:{' '}
        {hasLiveData ? (
          <span className='font-semibold text-green-500'>Yes</span>
        ) : (
          <span className='font-semibold text-gray-400'>No</span>
        )}
      </p>
      {relevantLiveData && relevantLiveData.length > 0 && (
        <ul className='text-xs text-blue-600 list-disc list-inside mt-1'>
          {relevantLiveData.map((data, index) => (
            <li key={index}>
              Bus {data.busNumber} in {data.timeUntilArrival}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default LiveTripCard;
