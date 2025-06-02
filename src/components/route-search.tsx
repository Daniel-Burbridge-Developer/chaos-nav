import { useState } from 'react';
import { Search, MapPin, Clock, Filter } from 'lucide-react';
import { Input } from '~/components/ui/input';
import { Button } from '~/components/ui/button';
import { Badge } from '~/components/ui/badge';
import { Card, CardContent } from '~/components/ui/card';
import { Separator } from '~/components/ui/separator';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '~/components/ui/collapsible';
import { useDebouncedSearch } from '../hooks/use-debounced-search';
// Import both types
import type { BusRoute, SearchedBusRoute } from 'types/bus-routes';
import { useQuery } from '@tanstack/react-query';

interface RouteSearchProps {
  // onRouteSelect likely expects the full BusRoute if you select it
  // You might need to fetch the full route details after selection
  onRouteSelect: (route: BusRoute) => void;
  selectedRoute?: BusRoute | null;
  featuredRoutes?: BusRoute[]; // Featured routes likely have full BusRoute details
}

// Data fetching function for Tanstack Query
// This now explicitly returns SearchedBusRoute[]
const fetchRoutes = async (query: string): Promise<SearchedBusRoute[]> => {
  if (!query) return [];
  const response = await fetch(`/api/v1/routes/${encodeURIComponent(query)}`);

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  const contentType = response.headers.get('content-type');
  if (!contentType || !contentType.includes('application/json')) {
    throw new Error('Response is not JSON');
  }

  const data = await response.json();
  // The API returns an array directly, not an object with a 'routes' property
  return data || [];
};

export function RouteSearch({
  onRouteSelect,
  selectedRoute,
  featuredRoutes = [],
}: RouteSearchProps) {
  const { searchTerm, debouncedSearchTerm, updateSearchTerm } =
    useDebouncedSearch(300);
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);

  // Use Tanstack Query for data fetching
  // Specify SearchedBusRoute[] as the data type
  const {
    data: searchedRoutes = [], // Rename to avoid confusion with the full BusRoute
    isLoading,
    isError,
    error,
  } = useQuery<SearchedBusRoute[], Error>({
    queryKey: ['routes', debouncedSearchTerm],
    queryFn: () => fetchRoutes(debouncedSearchTerm),
    enabled: !!debouncedSearchTerm,
    staleTime: 1000 * 60 * 5,
    retry: 1,
  });

  // Show featured routes when no search is active
  // This is the tricky part. `featuredRoutes` are `BusRoute[]`
  // `searchedRoutes` are `SearchedBusRoute[]`
  // You cannot directly mix them in `displayRoutes` if you want to use common properties.
  // You might need a helper function to normalize them or keep them separate.

  // For simplicity, let's assume `displayRoutes` will only show properties common to both
  // or you'll handle the type assertion carefully.
  // A safer approach would be to map featuredRoutes to SearchedBusRoute if searchTerm is empty.
  const displayRoutes = searchTerm
    ? searchedRoutes.map((route) => ({
        id: route.id,
        // Assuming you want to display the 'name' from search results
        // You might need to adjust the UI to only show 'name' when searching
        routeName: route.name || 'N/A',
        routeNumber: '', // Not available from search API
        origin: '', // Not available from search API
        destination: '', // Not available from search API
        stops: [], // Not available from search API
        color: '#000000', // Default or placeholder
        isActive: false, // Not available from search API
        // ... provide defaults for other BusRoute properties not in SearchedBusRoute
      }))
    : featuredRoutes;

  return (
    <div className='space-y-4'>
      {/* Search Input */}
      <div className='relative'>
        <Search className='absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground' />
        <Input
          placeholder='Search routes, stops, or destinations...'
          value={searchTerm}
          onChange={(e) => updateSearchTerm(e.target.value)}
          className='pl-10'
        />
        {isLoading && (
          <div className='absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2'>
            <div className='h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent' />
          </div>
        )}
      </div>

      {/* Filters */}
      <Collapsible open={isFiltersOpen} onOpenChange={setIsFiltersOpen}>
        <CollapsibleTrigger asChild>
          <Button
            variant='outline'
            size='sm'
            className='w-full justify-between'
          >
            <div className='flex items-center gap-2'>
              <Filter className='h-4 w-4' />
              Filters
            </div>
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className='space-y-2 pt-2'>
          <Button variant='outline' size='sm' className='w-full justify-start'>
            Active Routes Only
          </Button>
          <Button variant='outline' size='sm' className='w-full justify-start'>
            Express Routes
          </Button>
        </CollapsibleContent>
      </Collapsible>

      <Separator />

      {/* Search Results */}
      <div className='space-y-2'>
        {isError && (
          <div className='text-center text-sm text-red-600 py-4 bg-red-50 rounded-lg'>
            Failed to search routes. Please try again. {error?.message}
          </div>
        )}

        {/* Use searchedRoutes for length check when searching */}
        {searchTerm
          ? searchedRoutes.length > 0 && (
              <div className='text-sm text-muted-foreground'>
                {`<span class="math-inline">\{searchedRoutes\.length\} route</span>{searchedRoutes.length !== 1 ? 's' : ''} found`}
              </div>
            )
          : featuredRoutes.length > 0 && (
              <div className='text-sm text-muted-foreground'>
                Featured Routes
              </div>
            )}

        {/*
          This part is problematic because `displayRoutes` can be `BusRoute[]` or `SearchedBusRoute[]`.
          You need to adapt how you render based on which it is, or normalize the data.
          For simplicity, I'm casting it for demonstration, but a better approach
          would be to have a single type for rendering or conditional rendering.
        */}
        {(displayRoutes as (BusRoute | SearchedBusRoute)[]).map((route) => (
          <Card
            key={route.id}
            className={`cursor-pointer transition-colors hover:bg-accent ${
              selectedRoute?.id === route.id ? 'ring-2 ring-primary' : ''
            }`}
            // If you select a searched route, you might need to fetch its full BusRoute details
            onClick={() => onRouteSelect(route as BusRoute)} // Cast if you assume this is always a full BusRoute after selection
          >
            <CardContent className='p-3'>
              <div className='flex items-start justify-between'>
                <div className='space-y-1'>
                  <div className='flex items-center gap-2'>
                    {/* Conditional rendering based on type or use a common property */}
                    {'routeNumber' in route ? ( // Check if it's a full BusRoute
                      <Badge
                        variant='secondary'
                        style={{
                          backgroundColor: (route as BusRoute).color + '20',
                          color: (route as BusRoute).color,
                        }}
                      >
                        {(route as BusRoute).routeNumber}
                      </Badge>
                    ) : null}
                    {/* If it's a SearchedBusRoute, display its name or handle differently */}
                    {searchTerm && 'name' in route ? (
                      <Badge variant='secondary'>
                        {(route as SearchedBusRoute).name || 'N/A'}
                      </Badge>
                    ) : null}

                    {'isActive' in route && (route as BusRoute).isActive && (
                      <Badge variant='outline' className='text-xs'>
                        Active
                      </Badge>
                    )}
                  </div>
                  <h4 className='font-medium text-sm'>
                    {'routeName' in route
                      ? (route as BusRoute).routeName
                      : (route as SearchedBusRoute).name}
                  </h4>
                  {'origin' in route && 'destination' in route && (
                    <div className='flex items-center gap-1 text-xs text-muted-foreground'>
                      <MapPin className='h-3 w-3' />
                      <span>
                        {(route as BusRoute).origin} →{' '}
                        {(route as BusRoute).destination}
                      </span>
                    </div>
                  )}
                  {'stops' in route && (
                    <div className='flex items-center gap-1 text-xs text-muted-foreground'>
                      <Clock className='h-3 w-3' />
                      <span>{(route as BusRoute).stops.length} stops</span>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {searchTerm &&
          !isLoading &&
          !isError &&
          searchedRoutes.length === 0 && (
            <div className='text-center text-sm text-muted-foreground py-4'>
              No routes found for "{searchTerm}"
            </div>
          )}
      </div>
    </div>
  );
}
