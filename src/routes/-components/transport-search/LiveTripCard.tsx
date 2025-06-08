// src/components/transport-search/LiveTripCard.tsx
import { Trip } from '~/db/schema/trips';
import { useLiveTrips } from '~/hooks/use-live-trips';

import { useEffect } from 'react';

interface LiveTripItemProps {
  trip: Trip;
  onLiveStatusUpdate: (tripId: string, isLive: boolean) => void;
}

const LiveTripCard: React.FC<LiveTripItemProps> = ({
  trip,
  onLiveStatusUpdate,
}) => {
  console.log(
    `[LiveTripCard] Rendering for Trip ID: ${trip.id}, Headsign: ${trip.trip_headsign}`
  );

  const firstStopId = trip.stops?.[0]?.id ?? '';
  console.log(
    `[LiveTripCard] Trip ID: ${trip.id} - Determined firstStopId: ${firstStopId}`
  );

  const { data: liveData, isLoading, isError } = useLiveTrips(firstStopId);

  // Log status of the useLiveTrips hook
  useEffect(() => {
    if (isLoading) {
      console.log(
        `[LiveTripCard] Trip ID: ${trip.id} - Live data is loading...`
      );
    } else if (isError) {
      console.error(
        `[LiveTripCard] Trip ID: ${trip.id} - Error fetching live data.`
      );
    } else if (liveData) {
      console.log(
        `[LiveTripCard] Trip ID: ${trip.id} - Live data received:`,
        liveData
      );
    }
  }, [isLoading, isError, liveData, trip.id]);

  useEffect(() => {
    const isCurrentlyLive = (liveData?.length ?? 0) > 0;
    console.log(
      `[LiveTripCard] Trip ID: ${trip.id} - useEffect updating live status to: ${isCurrentlyLive}. Data length: ${liveData?.length ?? 0}`
    );
    onLiveStatusUpdate(trip.id, isCurrentlyLive);
  }, [liveData, trip.id, onLiveStatusUpdate]); // Dependencies for useEffect

  if (isLoading) {
    console.log(
      `[LiveTripCard] Trip ID: ${trip.id} - Displaying loading state.`
    );
    return (
      <p className='text-xs text-gray-400'>
        Loading live data for {trip.trip_headsign}...
      </p>
    );
  }
  if (isError) {
    console.log(`[LiveTripCard] Trip ID: ${trip.id} - Displaying error state.`);
    return (
      <p className='text-xs text-red-400'>
        Error fetching live data for {trip.trip_headsign}.
      </p>
    );
  }

  const hasLiveData = (liveData?.length ?? 0) > 0;
  console.log(
    `[LiveTripCard] Trip ID: ${trip.id} - hasLiveData: ${hasLiveData}`
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
      {liveData && liveData.length > 0 && (
        <ul className='text-xs text-blue-600 list-disc list-inside mt-1'>
          {liveData.map((data, index) => (
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
