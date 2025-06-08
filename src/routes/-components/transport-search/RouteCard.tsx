import { Badge, Card, CardContent } from '~/components/ui/library';
import type { Route } from '~/db/schema/routes';
import type { Trip } from '~/db/schema/trips';
import type { Stop } from '~/db/schema/stops';
import { useTripsByRoute } from '~/hooks/use-trips-by-route-search';
import { useState, useEffect } from 'react'; // Import useEffect
import LiveTripCard from './LiveTripCard';

interface RouteCardProps {
  route: Route;
}

interface RouteCardDisplay {
  name: string;
  live: boolean;

  stops: Stop[];
  stopsCount: number;

  trips: Trip[];
  uniqueDirections: string[];
}

const getUniqueHeadsignTrips = (trips: Trip[]) => {
  return trips
    ? Array.from(
        trips
          .filter((trip) => trip.trip_headsign !== null)
          .reduce((map, trip) => {
            // TypeScript now knows trip_headsign is string
            if (!map.has(trip.trip_headsign as string)) {
              map.set(trip.trip_headsign as string, trip);
            }
            return map;
          }, new Map<string, Trip>())
      ).map(([headsign, trip]) => trip)
    : [];
};

export const RouteCard = ({ route }: RouteCardProps) => {
  const { data: trips, isLoading, isError, error } = useTripsByRoute(route.id);
  const uniqueHeadsignTrips = getUniqueHeadsignTrips(trips ?? []);

  // State to track the live status of each individual trip
  const [liveTripStatuses, setLiveTripStatuses] = useState<
    Record<string, boolean>
  >({});
  const [isAnyTripLive, setIsAnyTripLive] = useState(false);

  // Callback to update the live status of a specific trip
  const handleLiveStatusUpdate = (tripId: string, isLive: boolean) => {
    setLiveTripStatuses((prevStatuses) => ({
      ...prevStatuses,
      [tripId]: isLive,
    }));
  };

  // Effect to determine if any trip is live whenever liveTripStatuses changes
  useEffect(() => {
    const anyLive = Object.values(liveTripStatuses).some((status) => status);
    setIsAnyTripLive(anyLive);
  }, [liveTripStatuses]);

  return (
    <Card className='cursor-pointer transition-all duration-200 hover:scale-[1.01] hover:shadow-md'>
      <CardContent className='p-3'>
        <div className='flex items-center gap-2'>
          <Badge
            variant='secondary'
            className='px-2 py-1 text-sm font-semibold rounded-md'
            style={{
              backgroundColor: 'hsl(var(--secondary))',
              color: 'hsl(var(--secondary-foreground))',
            }}
          >
            {route.short_name}
          </Badge>
          <h4 className='font-medium text-base leading-none'>
            {route.long_name}
          </h4>
          {/* Display 'LIVE' conditionally based on isAnyTripLive */}
          {isAnyTripLive && <h4 className='text-green-600 font-bold'>LIVE</h4>}
        </div>
        {/* Add more route details here if needed */}

        {uniqueHeadsignTrips?.map((trip) => (
          <LiveTripCard
            key={trip.id}
            trip={trip}
            onLiveStatusUpdate={handleLiveStatusUpdate}
          />
        ))}
      </CardContent>
    </Card>
  );
};
