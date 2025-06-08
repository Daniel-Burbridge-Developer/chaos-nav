// src/components/transport-search/LiveTripCard.tsx
import { Trip } from '~/db/schema/trips';
import { useLiveTrips } from '~/hooks/use-live-trips';
import { useEffect } from 'react';
import { useTripLiveStatus } from '~/hooks/use-trip-live-status'; // Import the new hook

interface LiveTripItemProps {
  trip: Trip;
  liveBusNumber: string;
  onLiveStatusUpdate: (tripId: string, isLive: boolean) => void;
}

const LiveTripCard: React.FC<LiveTripItemProps> = ({
  trip,
  liveBusNumber,
  onLiveStatusUpdate,
}) => {
  // Determine the first stop ID for fetching live data
  const firstStopId = trip.stops?.[0]?.id ?? '';

  // Fetch live data using the custom hook
  const { data: liveData, isLoading, isError } = useLiveTrips(firstStopId);

  // Use the new custom hook to determine live status
  const { isLive: hasLiveData, relevantLiveData } = useTripLiveStatus({
    liveData,
    liveBusNumber,
    tripHeadsign: trip.trip_headsign,
  });

  // Effect to notify the parent component about the live status
  useEffect(() => {
    // Call the parent's update function
    onLiveStatusUpdate(trip.id, hasLiveData);
  }, [hasLiveData, trip.id, onLiveStatusUpdate]); // Dependencies for useEffect

  // Render loading state
  if (isLoading) {
    return (
      <p className='text-xs text-gray-400'>
        Loading live data for {trip.trip_headsign}...
      </p>
    );
  }

  // Render error state
  if (isError) {
    return (
      <p className='text-xs text-red-400'>
        Error fetching live data for {trip.trip_headsign}.
      </p>
    );
  }

  // Render the trip card with live status and details
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
      {/* Conditionally render live data details if available */}
      {hasLiveData && (
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
