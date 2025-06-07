// src/components/transport-search/RouteSearch.tsx
import { Separator } from '~/components/ui/library';
import { useEffect, useState } from 'react';
import { useDebouncedSearch } from '~/hooks/use-debounced-search';
import { useTransportSearch } from '~/hooks/use-transport-search';
import { SearchInput } from './SearchInput';
import { FilterOptions } from './FilterOptions';
import { SearchResultsDisplay } from './SearchResultsDisplay';

type SearchFilter = 'all' | 'routes' | 'stops';

const RouteSearch = () => {
  const [hasMounted, setHasMounted] = useState(false);
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
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

  // Filtering logic:
  // Only apply filters if there's a debounced search term.
  // If debouncedSearchTerm is empty, filteredRoutes and filteredStops will also be empty,
  // which naturally leads to "Start typing..." or no results.
  const filteredRoutes =
    activeFilter === 'all' || activeFilter === 'routes' ? routes : [];
  const filteredStops =
    activeFilter === 'all' || activeFilter === 'stops' ? stops : [];

  // This totalResults is crucial for SearchResultsDisplay
  const totalResults = filteredRoutes.length + filteredStops.length;

  if (!hasMounted) {
    return <div>Loading...</div>;
  }

  return (
    <div className='space-y-4'>
      <SearchInput
        searchTerm={searchTerm}
        updateSearchTerm={updateSearchTerm}
        isSearching={isSearching}
        isFetching={isFetching}
      />

      <FilterOptions
        isFiltersOpen={isFiltersOpen}
        setIsFiltersOpen={setIsFiltersOpen}
        activeFilter={activeFilter}
        setActiveFilter={setActiveFilter}
      />

      <Separator />

      <SearchResultsDisplay
        error={error}
        totalResults={totalResults}
        debouncedSearchTerm={debouncedSearchTerm}
        isFetching={isFetching}
        isLoading={isLoading}
        filteredRoutes={filteredRoutes}
        filteredStops={filteredStops}
        activeFilter={activeFilter}
      />
    </div>
  );
};

export default RouteSearch;
