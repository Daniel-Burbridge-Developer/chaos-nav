import {
  Input,
  Button,
  Badge,
  Card,
  CardContent,
  Separator,
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "~/components/ui/library";

import { Search, MapPin, Clock, Filter } from "lucide-react";

import { useQuery } from "@tanstack/react-query";
import type { Route } from "~/db/schema/routes";
import { useDebouncedSearch } from "~/hooks/use-debounced-search";

const fetchRoutes = async (query: string): Promise<Route[]> => {
  if (!query.trim()) {
    return [];
  }

  const response = await fetch(`/api/v1/routes/${encodeURIComponent(query)}`);

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

  if (Array.isArray(data)) {
    return data;
  } else {
    console.warn("API response 'routes' field is not an array:", data.routes);
    return [];
  }
};

const useBusRoutes = (queryTerm: string) => {
  return useQuery({
    queryKey: ["routes", queryTerm],
    queryFn: () => fetchRoutes(queryTerm),
    enabled: !!queryTerm.trim(),
    staleTime: 1000 * 60 * 500,
  });
};

const RouteSearch = () => {
  const { searchTerm, debouncedSearchTerm, isSearching, updateSearchTerm } =
    useDebouncedSearch(300);
  const {
    data: fetchedRoutes,
    isLoading,
    isFetching,
    error,
  } = useBusRoutes(debouncedSearchTerm);

  const safeFetchedRoutes = fetchedRoutes ?? [];
  const displayRoutes = searchTerm ? safeFetchedRoutes : [];

  return (
    <div className="space-y-4">
      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search routes for now!, stops, or destinations... coming soon"
          value={searchTerm}
          onChange={(e) => updateSearchTerm(e.target.value)}
          className="pl-10"
        />
        {(isSearching || isFetching) && (
          <div className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        )}
      </div>
      {/* Search Input End*/}

      {/* Search Results: ONLY RENDER IF HAS MOUNTED ON CLIENT */}
      <div className="space-y-2">
        {error && (
          <div className="text-center text-sm text-red-600 py-4 bg-red-50 rounded-lg">
            {error.message}
          </div>
        )}

        {/* Conditionally render the entire search results section */}
        {displayRoutes.length > 0 && searchTerm && !isFetching && (
          <div className="text-sm text-muted-foreground">
            {`${displayRoutes.length} route${
              displayRoutes.length !== 1 ? "s" : ""
            } found`}
          </div>
        )}

        {Array.isArray(displayRoutes) && displayRoutes.length > 0
          ? displayRoutes.map((route) => (
              <Card
                key={route.id}
                className="cursor-pointer transition-colors hover:bg-accent"
              >
                <CardContent className="p-3">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary">{route.short_name}</Badge>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
              //   <Card
              //     key={route.id}
              //     className="cursor-pointer transition-colors hover:bg-accent"
              //   >
              //     <CardContent className="p-3">
              //       <div className="flex items-start justify-between">
              //         <div className="space-y-1">
              //           <div className="flex items-center gap-2">
              //             <Badge
              //               variant="secondary"
              //               style={{
              //                 backgroundColor: route.color + "20",
              //                 color: route.color,
              //               }}
              //             >
              //               {route.routeNumber}
              //             </Badge>
              //             {route.isActive && (
              //               <Badge variant="outline" className="text-xs">
              //                 Active
              //               </Badge>
              //             )}
              //           </div>
              //           <h4 className="font-medium text-sm">{route.routeName}</h4>
              //           <div className="flex items-center gap-1 text-xs text-muted-foreground">
              //             <MapPin className="h-3 w-3" />
              //             <span>
              //               {route.origin} → {route.destination}
              //             </span>
              //           </div>
              //           <div className="flex items-center gap-1 text-xs text-muted-foreground">
              //             <Clock className="h-3 w-3" />
              //             <span>{route.stops.length} stops</span>
              //           </div>
              //         </div>
              //       </div>
              //     </CardContent>
              //   </Card>
            ))
          : searchTerm &&
            !isFetching &&
            !error && (
              <div className="text-center text-sm text-muted-foreground py-4">
                No routes found for "{searchTerm}"
              </div>
            )}
      </div>
    </div>
  );
};

export default RouteSearch;
