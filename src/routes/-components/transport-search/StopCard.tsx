// src/components/transport-search/StopCard.tsx
import { Badge, Card, CardContent } from '~/components/ui/library';
import type { Stop } from '~/db/schema/stops';
import { MapPin } from 'lucide-react';
import { useLiveTrips } from '~/hooks/use-live-trips'; // Import the hook

// Define the structure for individual live trip data items
interface LiveTripDataItem {
  liveStatus: boolean;
  busNumber: string;
  timeUntilArrival: string;
  destination: string;
  tripId: string;
  fleetId: string | null;
}

interface StopCardProps {
  stop: Stop;
}

export const StopCard = ({ stop }: StopCardProps) => {
  // Use the useLiveTrips hook to fetch live data for this stop
  // The stop.id is passed as the query parameter (which maps to $stopNumber in your API route)
  const { data: liveData, isLoading, isError } = useLiveTrips(String(stop.id));

  return (
    <Card className='cursor-pointer transition-all duration-200 hover:scale-[1.01] hover:shadow-md'>
      <CardContent className='p-3'>
        <div className='flex items-center gap-2'>
          <Badge
            variant='outline'
            className='px-2 py-1 text-sm font-semibold rounded-md border-dashed'
          >
            {stop.id}
          </Badge>
          <h4 className='font-medium text-base leading-none'>{stop.name}</h4>
        </div>
        <div className='mt-1 flex items-center gap-1 text-xs text-muted-foreground'>
          <MapPin className='h-3 w-3' />
          <span>
            {stop.lat}, {stop.lon}
          </span>
        </div>

        {/* --- NEW SECTION: Live Trip Information --- */}
        <div className='mt-4 pt-3 border-t border-gray-200'>
          <h5 className='font-semibold text-sm mb-2'>Live Arrivals:</h5>
          {isLoading && (
            <p className='text-xs text-gray-500'>Loading live data...</p>
          )}
          {isError && (
            <p className='text-xs text-red-500'>Error loading live data.</p>
          )}
          {!isLoading && !isError && (!liveData || liveData.length === 0) && (
            <p className='text-xs text-gray-500'>
              No live arrivals currently available.
            </p>
          )}
          {!isLoading && !isError && liveData && liveData.length > 0 && (
            <ul className='space-y-1'>
              {liveData.map((item: LiveTripDataItem, index: number) => (
                <li key={item.tripId || index} className='text-xs'>
                  <span className='font-medium text-blue-600'>
                    Bus {item.busNumber}
                  </span>{' '}
                  to <span className='font-medium'>{item.destination}</span>:{' '}
                  <span
                    className={
                      item.liveStatus
                        ? 'text-green-600 font-semibold'
                        : 'text-gray-500'
                    }
                  >
                    {item.timeUntilArrival}{' '}
                    {item.liveStatus ? '(Live)' : '(Scheduled)'}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
        {/* --- END NEW SECTION --- */}
      </CardContent>
    </Card>
  );
};
