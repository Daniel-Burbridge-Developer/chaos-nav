import { useState, useEffect } from "react"
import { Search, MapPin, Clock, Filter } from "lucide-react"
import { Input } from "~/components/ui/input"
import { Button } from "~/components/ui/button"
import { Badge } from "~/components/ui/badge"
import { Card, CardContent } from "~/components/ui/card"
import { Separator } from "~/components/ui/separator"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "~/components/ui/collapsible"
import { useDebouncedSearch } from "../hooks/use-debounced-search"
import type { BusRoute } from "../types/bus-routes"

interface RouteSearchProps {
  onRouteSelect: (route: BusRoute) => void
  selectedRoute?: BusRoute | null
  featuredRoutes?: BusRoute[]
}

export function RouteSearch({ onRouteSelect, selectedRoute, featuredRoutes = [] }: RouteSearchProps) {
  const { searchTerm, debouncedSearchTerm, isSearching, updateSearchTerm } = useDebouncedSearch(300)
  const [routes, setRoutes] = useState<BusRoute[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isFiltersOpen, setIsFiltersOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Fetch routes when debounced search term changes
  useEffect(() => {
    if (debouncedSearchTerm) {
      fetchRoutes(debouncedSearchTerm)
    } else {
      setRoutes([])
    }
  }, [debouncedSearchTerm])

  const fetchRoutes = async (query: string) => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await fetch(`/api/v1/routes?q=${encodeURIComponent(query)}`)

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const contentType = response.headers.get("content-type")
      if (!contentType || !contentType.includes("application/json")) {
        throw new Error("Response is not JSON")
      }

      const data = await response.json()
      setRoutes(data.routes || [])
    } catch (error) {
      console.error("Error fetching routes:", error)
      setError("Failed to search routes. Please try again.")
      setRoutes([])
    } finally {
      setIsLoading(false)
    }
  }

  // Show featured routes when no search is active:
  const displayRoutes = searchTerm ? routes : featuredRoutes

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
        {(isSearching || isLoading) && (
          <div className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        )}
      </div>

      {/* Filters */}
      <Collapsible open={isFiltersOpen} onOpenChange={setIsFiltersOpen}>
        <CollapsibleTrigger asChild>
          <Button variant="outline" size="sm" className="w-full justify-between">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4" />
              Filters
            </div>
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="space-y-2 pt-2">
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
        {error && <div className="text-center text-sm text-red-600 py-4 bg-red-50 rounded-lg">{error}</div>}

        {displayRoutes.length > 0 && (
          <div className="text-sm text-muted-foreground">
            {searchTerm
              ? `${displayRoutes.length} route${displayRoutes.length !== 1 ? "s" : ""} found`
              : "Featured Routes"}
          </div>
        )}

        {displayRoutes.map((route) => (
          <Card
            key={route.id}
            className={`cursor-pointer transition-colors hover:bg-accent ${
              selectedRoute?.id === route.id ? "ring-2 ring-primary" : ""
            }`}
            onClick={() => onRouteSelect(route)}
          >
            <CardContent className="p-3">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" style={{ backgroundColor: route.color + "20", color: route.color }}>
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
        ))}

        {searchTerm && !isLoading && !error && routes.length === 0 && (
          <div className="text-center text-sm text-muted-foreground py-4">No routes found for "{searchTerm}"</div>
        )}
      </div>
    </div>
  )
}
