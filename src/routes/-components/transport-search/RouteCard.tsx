// src/components/transport-search/RouteCard.tsx
import { Badge, Card, CardContent } from '~/components/ui/library';
import type { Route } from '~/db/schema/routes'; // Assuming 'Route' has 'short_name' and 'long_name'
import type { Trip } from '~/db/schema/trips';
import type { Stop } from '~/db/schema/stops'; // Assuming this exists
import { useTripsByRoute } from '~/hooks/use-trips-by-route-search';
import { useState, useEffect, useCallback } from 'react';
import LiveTripCard from './LiveTripCard';
import { Star } from 'lucide-react';
import { useSelectedRoutesStore } from '~/stores/selectedRoutesStore';

interface RouteCardProps {
  route: Route; // This 'route' object likely contains 'short_name' and 'long_name'
}

interface RouteCardDisplay {
  // This interface is not directly used in render, but good for clarity
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
  const { addRoute } = useSelectedRoutesStore(); // Destructure addRoute from the store

  const [liveTripStatuses, setLiveTripStatuses] = useState<
    Record<string, boolean>
  >({});
  const [isAnyTripLive, setIsAnyTripLive] = useState(false);

  const handleLiveStatusUpdate = useCallback(
    (tripId: string, isLive: boolean) => {
      setLiveTripStatuses((prevStatuses) => ({
        ...prevStatuses,
        [tripId]: isLive,
      }));
    },
    []
  );

  useEffect(() => {
    const anyLive = Object.values(liveTripStatuses).some((status) => status);
    setIsAnyTripLive(anyLive);
  }, [liveTripStatuses]);

  // Helper function to determine the "bus number" for live data matching
  // It prioritizes short_name, then falls back to long_name if short_name is empty.
  const getBusNumberForLiveMatching = (currentRoute: Route): string => {
    // If short_name exists and is not just whitespace, use it.
    if (currentRoute.short_name && currentRoute.short_name.trim() !== '') {
      return currentRoute.short_name.trim();
    }
    // Otherwise, if long_name exists and is not just whitespace, use it.
    // This covers cases where long_name itself IS the bus number (e.g., "85").
    // If long_name might also include a description (e.g., "85 Glendalough Stn"),
    // and you only want the numeric part, you'd need a regex extraction here.
    // However, based on "No busses should have both...", it implies long_name
    // would be the pure number if short_name isn't.
    if (currentRoute.long_name && currentRoute.long_name.trim() !== '') {
      return currentRoute.long_name.trim();
    }
    // Fallback if neither contains a useful value.
    return '';
  };

  const busNumberToPass = getBusNumberForLiveMatching(route);

  // Handler for adding the route to the store
  const handleCardClick = () => {
    // Ensure trips are available before adding to the store
    if (uniqueHeadsignTrips.length > 0) {
      addRoute({
        name: busNumberToPass,
        trips: uniqueHeadsignTrips,
      });
      console.log('Route added to store:', {
        name: busNumberToPass,
        trips: uniqueHeadsignTrips,
      });
    } else {
      console.warn('No trips available to add for this route.');
    }
  };

  if (isLoading) {
    return <Card className='p-3'>Loading route trips...</Card>;
  }

  if (isError) {
    return (
      <Card className='p-3 text-red-500'>
        Error loading route trips: {error?.message}
      </Card>
    );
  }

  return (
    <Card
      className='cursor-pointer transition-all duration-200 hover:scale-[1.01] hover:shadow-md'
      onClick={handleCardClick} // Add the onClick handler here
    >
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
            {route.short_name}{' '}
            {/* Still display short_name in badge as primary identifier */}
          </Badge>
          <h4 className='font-medium text-base leading-none'>
            {route.long_name}
          </h4>
          {isAnyTripLive && <h4 className='text-green-600 font-bold'>LIVE</h4>}
          <div className='ml-auto flex items-center'>
            {/* Favorite star button, aligned top right */}
            <button
              type='button'
              aria-label='Favorite route'
              className='p-1 rounded-full hover:bg-muted transition-colors'
              style={{ lineHeight: 0 }}
              // TODO: Add favorite logic here
            >
              {/* Replaced inline SVG with Lucide's Star component */}
              <Star className='size-5 text-yellow-400 fill-current' />
            </button>
          </div>
        </div>

        {uniqueHeadsignTrips?.map((trip) => (
          <LiveTripCard
            key={trip.id}
            trip={trip}
            liveBusNumber={busNumberToPass} // <-- Pass the derived bus number here
            onLiveStatusUpdate={handleLiveStatusUpdate}
          />
        ))}
      </CardContent>
    </Card>
  );
};
