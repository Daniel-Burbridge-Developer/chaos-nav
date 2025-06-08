import { Trip } from '~/db/schema/trips';
import { useLiveTrips } from '~/hooks/use-live-trips';

import { useEffect } from 'react';

interface LiveTripItemProps {
  trip: Trip;
  // Ensure the callback signature matches what RouteCard expects
  onLiveStatusUpdate: (tripId: string, isLive: boolean) => void;
}

const LiveTripCard: React.FC<LiveTripItemProps> = ({
  trip,
  onLiveStatusUpdate,
}) => {
  // Use a more robust check for first stop if trip.stops can be empty or null
  const firstStopId = trip.stops?.[0]?.id ?? '';
  const { data: liveData, isLoading, isError } = useLiveTrips(firstStopId);

  useEffect(() => {
    // Determine if the current trip has live data
    const isCurrentlyLive = (liveData?.length ?? 0) > 0;
    // Call the parent's callback with the trip ID and its live status
    onLiveStatusUpdate(trip.id, isCurrentlyLive);
  }, [liveData, trip.id, onLiveStatusUpdate]); // Dependencies for useEffect

  if (isLoading) {
    return (
      <p className='text-xs text-gray-400'>
        Loading live data for {trip.trip_headsign}...
      </p>
    );
  }
  if (isError) {
    return (
      <p className='text-xs text-red-400'>
        Error fetching live data for {trip.trip_headsign}.
      </p>
    );
  }

  const hasLiveData = (liveData?.length ?? 0) > 0;

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
