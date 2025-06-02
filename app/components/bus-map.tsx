import { useState, useEffect } from "react"
import { MapPin, Navigation, Zap, Clock, Users, Star } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card"
import { Badge } from "~/components/ui/badge"
import { Button } from "~/components/ui/button"
import type { BusRoute } from "../types/bus-routes"

interface BusMapProps {
  selectedRoute?: BusRoute | null
}

export function BusMap({ selectedRoute }: BusMapProps) {
  const [currentLocation, setCurrentLocation] = useState<{ lat: number; lng: number } | null>(null)

  useEffect(() => {
    // Get user's current location
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setCurrentLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          })
        },
        (error) => {
          console.error("Error getting location:", error)
        },
      )
    }
  }, [])

  if (!selectedRoute) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-24 h-24 mx-auto bg-muted rounded-full flex items-center justify-center">
            <MapPin className="w-12 h-12 text-muted-foreground" />
          </div>
          <div className="space-y-2">
            <h3 className="text-lg font-semibold">Select a Route</h3>
            <p className="text-muted-foreground">Search for a bus route in the sidebar to view it on the map</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 space-y-6">
      {/* Route Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Badge
                variant="secondary"
                className="text-lg px-3 py-1"
                style={{ backgroundColor: selectedRoute.color + "20", color: selectedRoute.color }}
              >
                {selectedRoute.routeNumber}
              </Badge>
              <div>
                <CardTitle className="text-xl">{selectedRoute.routeName}</CardTitle>
                <p className="text-muted-foreground">
                  {selectedRoute.origin} → {selectedRoute.destination}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {selectedRoute.isActive && (
                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                  <div className="w-2 h-2 bg-green-500 rounded-full mr-1" />
                  Active
                </Badge>
              )}
              <Button variant="outline" size="sm">
                <Navigation className="w-4 h-4 mr-2" />
                Get Directions
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Map Area */}
        <div className="lg:col-span-2">
          <Card className="h-[500px]">
            <CardContent className="p-0 h-full">
              <div className="w-full h-full bg-gradient-to-br from-blue-50 to-indigo-100 rounded-lg flex items-center justify-center relative overflow-hidden">
                {/* Simulated Map Background */}
                <div className="absolute inset-0 opacity-20">
                  <div className="absolute top-10 left-10 w-32 h-32 bg-green-200 rounded-full" />
                  <div className="absolute top-32 right-20 w-24 h-24 bg-blue-200 rounded-full" />
                  <div className="absolute bottom-20 left-32 w-28 h-28 bg-purple-200 rounded-full" />
                </div>

                {/* Route Path Simulation */}
                <div className="relative z-10 w-full h-full p-8">
                  <div className="flex flex-col h-full justify-between">
                    {selectedRoute.stops.slice(0, 5).map((stop, index) => (
                      <div key={stop.id} className="flex items-center gap-4">
                        <div
                          className="w-4 h-4 rounded-full border-2 border-white shadow-lg"
                          style={{ backgroundColor: selectedRoute.color }}
                        />
                        <div className="bg-white/90 backdrop-blur-sm rounded-lg p-3 shadow-sm">
                          <p className="font-medium text-sm">{stop.name}</p>
                          {stop.arrivalTime && (
                            <p className="text-xs text-muted-foreground">Next: {stop.arrivalTime}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Map Controls */}
                <div className="absolute top-4 right-4 space-y-2">
                  <Button size="sm" variant="secondary" className="w-10 h-10 p-0">
                    +
                  </Button>
                  <Button size="sm" variant="secondary" className="w-10 h-10 p-0">
                    -
                  </Button>
                </div>

                {/* Current Location */}
                {currentLocation && (
                  <div className="absolute bottom-4 left-4">
                    <div className="bg-blue-500 w-3 h-3 rounded-full animate-pulse" />
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Route Details */}
        <div className="space-y-4">
          {/* Quick Stats */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Route Info</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <MapPin className="w-5 h-5 text-muted-foreground" />
                <div>
                  <p className="font-medium">{selectedRoute.stops.length} Stops</p>
                  <p className="text-sm text-muted-foreground">Total route length</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Clock className="w-5 h-5 text-muted-foreground" />
                <div>
                  <p className="font-medium">{selectedRoute.schedule[0]?.frequency || "Every 15 min"}</p>
                  <p className="text-sm text-muted-foreground">Frequency</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Zap className="w-5 h-5 text-muted-foreground" />
                <div>
                  <p className="font-medium">Express Service</p>
                  <p className="text-sm text-muted-foreground">Limited stops</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Upcoming Departures */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Next Departures</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {selectedRoute.schedule.slice(0, 3).map((schedule, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{schedule.departureTime}</p>
                      <p className="text-sm text-muted-foreground">From {selectedRoute.origin}</p>
                    </div>
                    <Badge variant="outline">{index === 0 ? "2 min" : `${(index + 1) * 15} min`}</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="space-y-2">
            <Button className="w-full">
              <Star className="w-4 h-4 mr-2" />
              Add to Favorites
            </Button>
            <Button variant="outline" className="w-full">
              <Users className="w-4 h-4 mr-2" />
              Share Route
            </Button>
          </div>
        </div>
      </div>

      {/* Stops List */}
      <Card>
        <CardHeader>
          <CardTitle>All Stops</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {selectedRoute.stops.map((stop, index) => (
              <div key={stop.id} className="flex items-center gap-3 p-3 rounded-lg border">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-muted text-sm font-medium">
                  {index + 1}
                </div>
                <div className="flex-1">
                  <p className="font-medium">{stop.name}</p>
                  {stop.arrivalTime && <p className="text-sm text-muted-foreground">Next: {stop.arrivalTime}</p>}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
