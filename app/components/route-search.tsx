"use client"

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
  onSearchChange: (query: string) => void
}

// Featured routes for initial display
const featuredRoutes: BusRoute[] = [
  {
    id: "1",
    routeNumber: "42",
    routeName: "Downtown Express",
    origin: "Central Station",
    destination: "Airport Terminal",
    color: "#3B82F6",
    isActive: true,
    stops: [
      { id: "1", name: "Central Station", latitude: 40.7128, longitude: -74.006, arrivalTime: "2 min" },
      { id: "2", name: "City Hall", latitude: 40.713, longitude: -74.0065, arrivalTime: "8 min" },
      { id: "3", name: "Union Square", latitude: 40.7135, longitude: -74.007, arrivalTime: "15 min" },
      { id: "4", name: "Grand Central", latitude: 40.714, longitude: -74.0075, arrivalTime: "22 min" },
      { id: "5", name: "Airport Terminal", latitude: 40.7145, longitude: -74.008, arrivalTime: "35 min" },
    ],
    schedule: [
      { departureTime: "2:15 PM", arrivalTime: "2:50 PM", frequency: "Every 15 min" },
      { departureTime: "2:30 PM", arrivalTime: "3:05 PM", frequency: "Every 15 min" },
      { departureTime: "2:45 PM", arrivalTime: "3:20 PM", frequency: "Every 15 min" },
    ],
  },
  {
    id: "2",
    routeNumber: "15",
    routeName: "University Line",
    origin: "Campus North",
    destination: "Downtown Mall",
    color: "#10B981",
    isActive: true,
    stops: [
      { id: "6", name: "Campus North", latitude: 40.715, longitude: -74.009, arrivalTime: "5 min" },
      { id: "7", name: "Student Center", latitude: 40.7155, longitude: -74.0095, arrivalTime: "12 min" },
      { id: "8", name: "Library", latitude: 40.716, longitude: -74.01, arrivalTime: "18 min" },
      { id: "9", name: "Downtown Mall", latitude: 40.7165, longitude: -74.0105, arrivalTime: "25 min" },
    ],
    schedule: [
      { departureTime: "2:20 PM", arrivalTime: "2:45 PM", frequency: "Every 20 min" },
      { departureTime: "2:40 PM", arrivalTime: "3:05 PM", frequency: "Every 20 min" },
    ],
  },
]

export function RouteSearch({ onRouteSelect, onSearchChange }: RouteSearchProps) {
  const [isFiltersOpen, setIsFiltersOpen] = useState(false)
  const { searchTerm, debouncedSearchTerm, isSearching, updateSearchTerm } = useDebouncedSearch(300)
  const [routes, setRoutes] = useState<BusRoute[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Notify parent of search changes
  useEffect(() => {
    onSearchChange(searchTerm)
  }, [searchTerm, onSearchChange])

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

  // Show featured routes when no search is active
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
            className="cursor-pointer transition-colors hover:bg-accent"
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
