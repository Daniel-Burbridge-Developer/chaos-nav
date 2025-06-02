import { useState, useEffect, useMemo } from "react";
import { Search, MapPin, Clock, Filter } from "lucide-react";
import { useQuery } from "@tanstack/react-query"; // Import useQuery
import { Input } from "~/components/ui/input";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import { Card, CardContent } from "~/components/ui/card";
import { Separator } from "~/components/ui/separator";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "~/components/ui/collapsible";
import { useDebouncedSearch } from "../hooks/use-debounced-search";
import type { BusRoute } from "../types/bus-routes";

interface RouteSearchProps {
  onRouteSelect: (route: BusRoute) => void;
  onSearchChange: (query: string) => void;
}

export function RouteSearch({
  onRouteSelect,
  onSearchChange,
}: RouteSearchProps) {
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const { searchTerm, debouncedSearchTerm, isSearching, updateSearchTerm } =
    useDebouncedSearch(300);

  // Notify parent of search changes
  useEffect(() => {
    onSearchChange(searchTerm);
  }, [searchTerm, onSearchChange]);

  // Define the query function for fetching routes
  const fetchRoutes = async (query: string): Promise<BusRoute[]> => {
    // Only fetch if query is not empty or just whitespace
    if (!query.trim()) {
      return [];
    }

    const response = await fetch(
      `/api/v1/routes?q=${encodeURIComponent(query)}`
    );

    if (!response.ok) {
      throw new Error(
        `Failed to fetch routes: ${response.status} ${response.statusText}`
      );
    }

    const contentType = response.headers.get("content-type");
    if (!contentType || !contentType.includes("application/json")) {
      throw new Error("Received non-JSON response from API.");
    }

    const data = await response.json();

    // Ensure data.routes is an array
    if (Array.isArray(data.routes)) {
      return data.routes;
    } else {
      console.warn("API response 'routes' field is not an array:", data.routes);
      return []; // Default to empty array if unexpected data format
    }
  };

  // Use Tanstack Query to manage route fetching
  const {
    data: routes = [], // Destructure data and provide a default empty array
    isLoading,
    isFetching, // isFetching indicates background fetching (e.g., refetching on window focus)
    error,
  } = useQuery<BusRoute[], Error>({
    // Query key changes when debouncedSearchTerm changes, triggering a refetch
    queryKey: ["routes", debouncedSearchTerm],
    queryFn: () => fetchRoutes(debouncedSearchTerm),
    // Only enable the query if debouncedSearchTerm is not empty or just whitespace
    enabled: !!debouncedSearchTerm.trim(),
    staleTime: 1000 * 60 * 50, // Data is considered fresh for 5 minutes
    // You can add other options here, e.g., retry, retryDelay, refetchOnWindowFocus etc.
  });

  // displayRoutes is now directly derived from `routes` (which is `data` from useQuery)
  // and will always be an array due to the `routes = []` default in destructuring
  const displayRoutes = searchTerm ? routes : [];

  return (
    <div className="space-y-4">
      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search routes, stops, or destinations..."
          value={searchTerm}
          onChange={(e) => updateSearchTerm(e.target.value)}
          className="pl-10"
        />
        {/* Use isFetching for the spinner, as isLoading is only true on first fetch */}
        {(isSearching || isFetching) && (
          <div className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        )}
      </div>

      {/* Filters */}
      <Collapsible open={isFiltersOpen} onOpenChange={setIsFiltersOpen}>
        <CollapsibleTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="w-full justify-between"
          >
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4" />
              Filters
            </div>
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="space-y-2 pt-2">
          {/* These buttons still need logic to apply filters.
              With Tanstack Query, you might add filter parameters
              to the `queryKey` and adjust `fetchRoutes` to use them. */}
          <Button variant="outline" size="sm" className="w-full justify-start">
            Active Routes Only
          </Button>
          <Button variant="outline" size="sm" className="w-full justify-start">
            Express Routes
          </Button>
        </CollapsibleContent>
      </Collapsible>

      <Separator />

      {/* Search Results */}
      <div className="space-y-2">
        {error && (
          <div className="text-center text-sm text-red-600 py-4 bg-red-50 rounded-lg">
            {error.message} {/* Display error message from the caught error */}
          </div>
        )}

        {/* Show count only if there are routes AND a search term AND not currently fetching data */}
        {displayRoutes.length > 0 && searchTerm && !isFetching && (
          <div className="text-sm text-muted-foreground">
            {`${displayRoutes.length} route${
              displayRoutes.length !== 1 ? "s" : ""
            } found`}
          </div>
        )}

        {/* Render routes if available */}
        {displayRoutes.length > 0
          ? displayRoutes?.map((route) => (
              <Card
                key={route.id}
                className="cursor-pointer transition-colors hover:bg-accent"
                onClick={() => onRouteSelect(route)}
              >
                <CardContent className="p-3">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Badge
                          variant="secondary"
                          style={{
                            backgroundColor: route.color + "20",
                            color: route.color,
                          }}
                        >
                          {route.routeNumber}
                        </Badge>
                        {route.isActive && (
                          <Badge variant="outline" className="text-xs">
                            Active
                          </Badge>
                        )}
                      </div>
                      <h4 className="font-medium text-sm">{route.routeName}</h4>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <MapPin className="h-3 w-3" />
                        <span>
                          {route.origin} → {route.destination}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        <span>{route.stops.length} stops</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          : // Show "No routes found" message only when search term is present, not fetching, and no error
            searchTerm &&
            !isFetching &&
            !error && (
              <div className="text-center text-sm text-muted-foreground py-4">
                No routes found for "{searchTerm}"
              </div>
            )}
      </div>
    </div>
  );
}
