// src/components/transport-search/SearchResultsDisplay.tsx
import { Separator } from '~/components/ui/library';
import type { Route } from '~/db/schema/routes';
import type { Stop } from '~/db/schema/stops';
import { RouteCard } from './RouteCard';
import { StopCard } from './StopCard';
import { Search, MapPin, ChevronDown, ChevronUp } from 'lucide-react'; // Import Chevron icons
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '~/components/ui/collapsible'; // Import Collapsible components
import { useState } from 'react'; // Import useState

type SearchFilter = 'all' | 'routes' | 'stops';

interface SearchResultsDisplayProps {
  error: Error | null;
  totalResults: number;
  debouncedSearchTerm: string;
  isFetching: boolean;
  isLoading: boolean;
  filteredRoutes: Route[];
  filteredStops: Stop[];
  activeFilter: SearchFilter;
}

export const SearchResultsDisplay = ({
  error,
  totalResults,
  debouncedSearchTerm,
  isFetching,
  isLoading,
  filteredRoutes,
  filteredStops,
  activeFilter,
}: SearchResultsDisplayProps) => {
  // State for managing the collapsible sections
  const [isRoutesOpen, setIsRoutesOpen] = useState(true);
  const [isStopsOpen, setIsStopsOpen] = useState(true);

  // Handle loading state
  if (isLoading || isFetching) {
    return null; // Or render a skeleton for the results area if desired
  }

  // Handle error state
  if (error) {
    return (
      <div className='text-center text-sm text-red-600 py-4 bg-red-50 rounded-lg'>
        Error: {error.message}
      </div>
    );
  }

  // Handle no search term
  if (!debouncedSearchTerm) {
    return (
      <div className='text-center text-sm text-muted-foreground py-4'>
        Start typing to search for routes or stops.
      </div>
    );
  }

  // Handle results found or no results for a given search term
  return (
    <div className='space-y-6'>
      {totalResults > 0 && (
        <div className='text-sm text-muted-foreground'>
          {`${totalResults} result${totalResults !== 1 ? 's' : ''} found`}
        </div>
      )}

      {/* Routes Section */}
      {filteredRoutes.length > 0 && (
        <Collapsible open={isRoutesOpen} onOpenChange={setIsRoutesOpen}>
          <div className='p-4 border rounded-lg bg-card text-card-foreground shadow-sm'>
            <CollapsibleTrigger asChild>
              <button className='flex items-center justify-between w-full p-0 bg-transparent hover:bg-transparent focus-visible:outline-none focus-visible:ring-0'>
                <h3 className='font-bold text-lg text-primary flex items-center gap-2'>
                  <Search className='h-5 w-5' /> Routes ({filteredRoutes.length}
                  )
                </h3>
                {isRoutesOpen ? (
                  <ChevronUp className='h-5 w-5 text-muted-foreground' />
                ) : (
                  <ChevronDown className='h-5 w-5 text-muted-foreground' />
                )}
              </button>
            </CollapsibleTrigger>
            <Separator className='my-2' />{' '}
            {/* Changed mb-2 to my-2 for consistent spacing */}
            <CollapsibleContent className='space-y-2'>
              {filteredRoutes.map((route) => (
                <RouteCard key={route.id} route={route} />
              ))}
            </CollapsibleContent>
          </div>
        </Collapsible>
      )}

      {/* Stops Section */}
      {filteredStops.length > 0 && (
        <Collapsible open={isStopsOpen} onOpenChange={setIsStopsOpen}>
          <div className='p-4 border rounded-lg bg-card text-card-foreground shadow-sm'>
            <CollapsibleTrigger asChild>
              <button className='flex items-center justify-between w-full p-0 bg-transparent hover:bg-transparent focus-visible:outline-none focus-visible:ring-0'>
                <h3 className='font-bold text-lg text-primary flex items-center gap-2'>
                  <MapPin className='h-5 w-5' /> Stops ({filteredStops.length})
                </h3>
                {isStopsOpen ? (
                  <ChevronUp className='h-5 w-5 text-muted-foreground' />
                ) : (
                  <ChevronDown className='h-5 w-5 text-muted-foreground' />
                )}
              </button>
            </CollapsibleTrigger>
            <Separator className='my-2' />{' '}
            {/* Changed mb-2 to my-2 for consistent spacing */}
            <CollapsibleContent className='space-y-2'>
              {filteredStops.map((stop) => (
                <StopCard key={stop.id} stop={stop} />
              ))}
            </CollapsibleContent>
          </div>
        </Collapsible>
      )}

      {/* No results message (only if search term exists and no results found) */}
      {totalResults === 0 && (
        <div className='text-center text-sm text-muted-foreground py-4'>
          {activeFilter === 'routes'
            ? `No routes found for "${debouncedSearchTerm}"`
            : activeFilter === 'stops'
              ? `No stops found for "${debouncedSearchTerm}"`
              : `No routes or stops found for "${debouncedSearchTerm}"`}
        </div>
      )}
    </div>
  );
};
