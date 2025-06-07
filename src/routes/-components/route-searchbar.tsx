import {
  Input,
  Badge,
  Card,
  CardContent,
  Separator,
} from '~/components/ui/library';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '~/components/ui/collapsible';
import { Button } from '~/components/ui/button';
import { Search, MapPin, Clock, Filter } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import type { Route } from '~/db/schema/routes';
import type { Stop } from '~/db/schema/stops';
import { useDebouncedSearch } from '~/hooks/use-debounced-search';
import { useEffect, useState } from 'react';

// Define filter types
type SearchFilter = 'all' | 'routes' | 'stops';

// Unified fetch function for both routes and stops
const fetchSearchResults = async (query: string) => {
  if (!query.trim()) {
    return { routes: [], stops: [] };
  }

  try {
    const [routesResponse, stopsResponse] = await Promise.all([
      fetch(`/api/v1/routes/${encodeURIComponent(query)}`),
      fetch(`/api/v1/stops/${encodeURIComponent(query)}`),
    ]);

    const parseResponse = async (response: Response, type: string) => {
      if (!response.ok) {
        throw new Error(
          `Failed to fetch ${type}: ${response.status} ${response.statusText}`
        );
      }
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error(`Received non-JSON response from ${type} API.`);
      }
      const data = await response.json();
      if (Array.isArray(data)) {
        return data;
      } else {
        console.warn(`API response for ${type} is not an array:`, data);
        return [];
      }
    };

    const routes = (await parseResponse(routesResponse, 'routes')) as Route[];
    const stops = (await parseResponse(stopsResponse, 'stops')) as Stop[];

    return { routes, stops };
  } catch (error) {
    console.error('Error fetching search results:', error);
    return { routes: [], stops: [] };
  }
};

const useTransportSearch = (queryTerm: string, mounted: boolean) => {
  return useQuery({
    queryKey: ['transportSearch', queryTerm],
    queryFn: () => fetchSearchResults(queryTerm),
    enabled: !!queryTerm.trim() && mounted,
    staleTime: 1000 * 60 * 5,
  });
};

const RouteSearch = () => {
  const [hasMounted, setHasMounted] = useState(false);
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  // New state for the active filter type
  const [activeFilter, setActiveFilter] = useState<SearchFilter>('all');

  useEffect(() => {
    setHasMounted(true);
  }, []);

  const { searchTerm, debouncedSearchTerm, isSearching, updateSearchTerm } =
    useDebouncedSearch(300);

  const {
    data: searchResults,
    isLoading,
    isFetching,
    error,
  } = useTransportSearch(debouncedSearchTerm, hasMounted);

  const routes = searchResults?.routes ?? [];
  const stops = searchResults?.stops ?? [];

  // Filter logic based on activeFilter state - CORRECTED
  const filteredRoutes =
    debouncedSearchTerm && (activeFilter === 'all' || activeFilter === 'routes')
      ? routes
      : [];
  const filteredStops =
    debouncedSearchTerm && (activeFilter === 'all' || activeFilter === 'stops')
      ? stops
      : [];

  const totalResults = filteredRoutes.length + filteredStops.length;

  return hasMounted ? (
    <div className='space-y-4'>
      {/* Search Input */}
      <div className='relative'>
        <Search className='absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground' />
        <Input
          placeholder='Search routes or stops'
          value={searchTerm}
          onChange={(e) => updateSearchTerm(e.target.value)}
          className='pl-10'
        />
        {(isSearching || isFetching) && (
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
              Filters:{' '}
              <span className='font-semibold capitalize'>
                {activeFilter}
              </span>{' '}
              {/* Display active filter */}
            </div>
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className='space-y-2 pt-2'>
          <Button
            variant={activeFilter === 'all' ? 'default' : 'outline'}
            size='sm'
            className='w-full justify-start'
            onClick={() => {
              setActiveFilter('all');
              setIsFiltersOpen(false); // Close collapsible on selection
            }}
          >
            Show All
          </Button>
          <Button
            variant={activeFilter === 'routes' ? 'default' : 'outline'}
            size='sm'
            className='w-full justify-start'
            onClick={() => {
              setActiveFilter('routes');
              setIsFiltersOpen(false);
            }}
          >
            Only Routes
          </Button>
          <Button
            variant={activeFilter === 'stops' ? 'default' : 'outline'}
            size='sm'
            className='w-full justify-start'
            onClick={() => {
              setActiveFilter('stops');
              setIsFiltersOpen(false);
            }}
          >
            Only Stops
          </Button>
          {/* You can re-introduce "Active Routes Only" or "Express Routes" here if needed,
              but they would apply *after* the primary "routes/stops" filter. */}
        </CollapsibleContent>
      </Collapsible>

      <Separator />

      {/* Search Results */}
      <div className='space-y-6'>
        {error && (
          <div className='text-center text-sm text-red-600 py-4 bg-red-50 rounded-lg'>
            Error: {error.message}
          </div>
        )}

        {totalResults > 0 &&
          debouncedSearchTerm &&
          !isFetching && ( // Use debouncedSearchTerm here too
            <div className='text-sm text-muted-foreground'>
              {`${totalResults} result${totalResults !== 1 ? 's' : ''} found`}
            </div>
          )}

        {/* Routes Section */}
        {filteredRoutes.length > 0 && (
          <div className='space-y-3 p-4 border rounded-lg bg-card text-card-foreground shadow-sm'>
            <h3 className='font-bold text-lg text-primary flex items-center gap-2'>
              <Search className='h-5 w-5' /> Routes ({filteredRoutes.length})
            </h3>
            <Separator className='mb-2' />
            <div className='space-y-2'>
              {filteredRoutes.map((route) => (
                <Card
                  key={route.id}
                  className='cursor-pointer transition-all duration-200 hover:scale-[1.01] hover:shadow-md'
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
                        {route.short_name}
                      </Badge>
                      <h4 className='font-medium text-base leading-none'>
                        {route.long_name}
                      </h4>
                    </div>
                    {/* Add more route details here */}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Stops Section */}
        {filteredStops.length > 0 && (
          <div className='space-y-3 p-4 border rounded-lg bg-card text-card-foreground shadow-sm'>
            <h3 className='font-bold text-lg text-primary flex items-center gap-2'>
              <MapPin className='h-5 w-5' /> Stops ({filteredStops.length})
            </h3>
            <Separator className='mb-2' />
            <div className='space-y-2'>
              {filteredStops.map((stop) => (
                <Card
                  key={stop.id}
                  className='cursor-pointer transition-all duration-200 hover:scale-[1.01] hover:shadow-md'
                >
                  <CardContent className='p-3'>
                    <div className='flex items-center gap-2'>
                      <Badge
                        variant='outline'
                        className='px-2 py-1 text-sm font-semibold rounded-md border-dashed'
                      >
                        {stop.id}
                      </Badge>
                      <h4 className='font-medium text-base leading-none'>
                        {stop.name}
                      </h4>
                    </div>
                    <div className='mt-1 flex items-center gap-1 text-xs text-muted-foreground'>
                      <MapPin className='h-3 w-3' />
                      <span>
                        {stop.lat}, {stop.lon}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* No results message */}
        {totalResults === 0 &&
          debouncedSearchTerm &&
          !isFetching &&
          !error && ( // Use debouncedSearchTerm here
            <div className='text-center text-sm text-muted-foreground py-4'>
              {debouncedSearchTerm
                ? activeFilter === 'routes'
                  ? `No routes found for "${debouncedSearchTerm}"`
                  : activeFilter === 'stops'
                    ? `No stops found for "${debouncedSearchTerm}"`
                    : `No routes or stops found for "${debouncedSearchTerm}"`
                : 'Start typing to search for routes or stops.'}
            </div>
          )}
      </div>
    </div>
  ) : (
    <div>Loading...</div>
  );
};

export default RouteSearch;
