// src/components/BusMap.tsx
'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  MapContainer,
  TileLayer,
  Marker,
  Polyline,
  Popup,
  useMap,
} from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MapPin, Clock, Info, Star, Users } from 'lucide-react';

// Assuming you have these shadcn/ui components or similar
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card';
import { Badge } from '~/components/ui/badge';
import { Button } from '~/components/ui/button';

import { useSelectedRoutesStore } from '~/stores/selectedRoutesStore';

// Import your schema types
import type { Stop } from '~/db/schema/stops';
import type { Trip, TripStop as SchemaTripStop } from '~/db/schema/trips';

// Define an EnrichedStop type that merges the `Stop` schema with `TripStop` details.
// This is the crucial type that represents the items within your `trip.stops` array
// in the Zustand store, which are assumed to contain lat/lon/name *in addition*
// to arrivalTime and stopSequence.
type EnrichedStop = Stop & SchemaTripStop;

// --- LEAFLET MARKER ICON FIX ---
// This is crucial for markers to appear correctly in React applications
// that use a bundler like Webpack (which Next.js uses).
// Place this at the very top of the file, outside the component.
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: '/markers/marker-icon-2x.png',
  iconUrl: '/markers/marker-icon.png',
  shadowUrl: '/markers/marker-shadow.png',
});

// --- Custom Leaflet Icon Definitions ---
// Function to create a dynamically colored marker icon
const createColoredMarkerIcon = (color: string) => {
  return L.divIcon({
    className: 'custom-div-icon',
    html: `<svg width="24" height="24" viewBox="0 0 24 24" fill="${color}" stroke="white" stroke-width="2" stroke-linejoin="round" class="feather feather-map-pin">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
            <circle cx="12" cy="10" r="3"></circle>
          </svg>`,
    iconSize: [24, 24],
    iconAnchor: [12, 24], // Point of the icon which will correspond to marker's location
    popupAnchor: [0, -20], // Point from which the popup should open relative to the iconAnchor
  });
};

// Icon for user's current location
const userLocationIcon = L.icon({
  iconUrl: '/markers/current-location.png',
  iconRetinaUrl: '/markers/current-location-2x.png',
  iconSize: [30, 30],
  iconAnchor: [15, 15],
  popupAnchor: [0, -15],
});

// --- Route Colors for Visual Coding ---
const routeColors = [
  '#EF4444', // Red
  '#3B82F6', // Blue
  '#10B981', // Green
  '#F59E0B', // Amber
  '#6366F1', // Indigo
  '#EC4899', // Pink
  '#06B6D4', // Cyan
  '#8B5CF6', // Violet
  '#34D399', // Emerald
  '#F472B6', // Rose
  '#6EE7B7', // Teal
  '#A78BFA', // Purple
];

// --- Map View Updater Component ---
// This component re-centers the map when its 'center' prop changes
function MapViewUpdater({ center }: { center: L.LatLngTuple }) {
  const map = useMap(); // Access the Leaflet map instance
  useEffect(() => {
    map.setView(center, map.getZoom()); // Set map view to new center
  }, [center, map]); // Re-run effect when center or map instance changes
  return null; // This component renders nothing
}

// --- Main BusMap Component ---
export function BusMap() {
  // Access selected routes from Zustand store
  const { selectedRoutes } = useSelectedRoutesStore();

  // State to store user's current geographic location
  const [currentLocation, setCurrentLocation] = useState<{
    lat: number;
    lng: number;
  } | null>(null);

  // Default map center (Perth, Western Australia) for fallback
  const defaultCenter: L.LatLngTuple = useMemo(() => [-31.9505, 115.8605], []);

  // Effect to get the user's current location once on component mount
  useEffect(() => {
    if (typeof window !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setCurrentLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
        },
        (error) => {
          console.error('Error getting location:', error);
          // If geolocation fails, set a fallback to the default center
          setCurrentLocation({ lat: defaultCenter[0], lng: defaultCenter[1] });
        },
        { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 } // Geolocation options
      );
    } else {
      // If geolocation is not supported, immediately fallback to default center
      setCurrentLocation({ lat: defaultCenter[0], lng: defaultCenter[1] });
    }
  }, [defaultCenter]); // Dependency array includes defaultCenter

  // Consolidate all unique stops for rendering on the map
  // This memoized value recalculates only when selectedRoutes changes.
  const allStops = useMemo(() => {
    // Using a Map to store unique stops by their ID for efficient lookup
    const uniqueMapStops = new Map<
      string,
      EnrichedStop & { routeName: string; routeColor: string }
    >();

    selectedRoutes.forEach((route, routeIndex) => {
      // Assign a color to the route based on its index
      const color = routeColors[routeIndex % routeColors.length];
      route.trips.forEach((trip: Trip) => {
        // Ensure trip.stops exists and is an array
        if (trip.stops && Array.isArray(trip.stops)) {
          // Iterate over each stop in the trip (assuming it's an EnrichedStop)
          (trip.stops as EnrichedStop[]).forEach((stop: EnrichedStop) => {
            // Check if stop has valid ID and coordinates
            if (
              stop.id !== undefined &&
              stop.lat !== null &&
              stop.lon !== null
            ) {
              const stopIdKey = stop.id;
              // If the stop hasn't been added yet, add it to our unique map
              if (!uniqueMapStops.has(stopIdKey)) {
                uniqueMapStops.set(stopIdKey, {
                  ...stop, // Spread all properties from the enriched stop (id, name, lat, lon, arrivalTime, stopSequence)
                  routeName: route.name, // Add the route name for display
                  routeColor: color, // Add the route color for marker styling
                });
              }
              // Note: If a stop is part of multiple selected routes, the first route's color/name
              // will be used for the marker and popup, for simplicity.
              // To show all routes a stop belongs to, the `uniqueMapStops` value
              // would need to store an array of associated routes/times.
            }
          });
        }
      });
    });
    return Array.from(uniqueMapStops.values()); // Convert Map values back to an array
  }, [selectedRoutes]); // Dependency on selectedRoutes

  // Prepare polylines (lines connecting stops) for each trip
  // This memoized value recalculates only when selectedRoutes changes.
  const allPolylines = useMemo(() => {
    const polylines: {
      positions: L.LatLngTuple[]; // Array of [lat, lon] tuples for the line
      color: string;
      routeName: string;
      tripId: string;
      tripHeadsign: string | null;
    }[] = [];

    selectedRoutes.forEach((route, routeIndex) => {
      const color = routeColors[routeIndex % routeColors.length];
      route.trips.forEach((trip: Trip) => {
        // Ensure trip has stops and at least two to form a line
        if (trip.stops && Array.isArray(trip.stops) && trip.stops.length > 1) {
          // Sort stops by sequence to draw the polyline correctly along the trip path
          const sortedEnrichedStops = [...(trip.stops as EnrichedStop[])].sort(
            (a, b) => a.stopSequence - b.stopSequence
          );

          const tripCoordinates: L.LatLngTuple[] = [];
          for (const stop of sortedEnrichedStops) {
            // Add coordinates only if they are valid numbers
            if (stop.lat !== null && stop.lon !== null) {
              tripCoordinates.push([stop.lat, stop.lon]);
            }
          }

          // Only add a polyline if we have at least two valid points
          if (tripCoordinates.length > 1) {
            polylines.push({
              positions: tripCoordinates,
              color: color,
              routeName: route.name,
              tripId: trip.id,
              tripHeadsign: trip.trip_headsign,
            });
          }
        }
      });
    });
    return polylines;
  }, [selectedRoutes]); // Dependency on selectedRoutes

  // Determine the map's initial center and zoom level dynamically.
  const mapCenter = useMemo(() => {
    // 1. Prioritize User's Current Location if available and valid
    if (
      currentLocation &&
      currentLocation.lat !== null &&
      currentLocation.lng !== null
    ) {
      return [currentLocation.lat, currentLocation.lng] as L.LatLngTuple;
    }

    // 2. Otherwise, try to center on the first valid stop of any selected trip
    // Iterate through all selected routes and their trips to find the first stop with coordinates
    for (const route of selectedRoutes) {
      if (route.trips && Array.isArray(route.trips)) {
        for (const trip of route.trips) {
          if (
            trip.stops &&
            Array.isArray(trip.stops) &&
            trip.stops.length > 0
          ) {
            // Find the first enriched stop object within this trip that has valid coordinates
            const firstValidStop = (trip.stops as EnrichedStop[]).find(
              (stop) => stop.lat !== null && stop.lon !== null
            );
            // If a valid stop is found, use its coordinates for the center
            if (firstValidStop) {
              return [
                firstValidStop.lat as number,
                firstValidStop.lon as number,
              ] as L.LatLngTuple;
            }
          }
        }
      }
    }

    // 3. Fallback to the default predefined center if no dynamic center is found
    return defaultCenter;
  }, [currentLocation, selectedRoutes, defaultCenter]); // Dependencies for memoization

  // Adjust zoom level based on whether routes are selected
  const mapZoom = selectedRoutes.length > 0 ? 13 : 11;

  // Render nothing if no routes are selected, displaying a placeholder message
  if (selectedRoutes.length === 0) {
    return (
      <div className='flex-1 flex items-center justify-center'>
        <div className='text-center space-y-4'>
          <div className='w-24 h-24 mx-auto bg-muted rounded-full flex items-center justify-center'>
            <MapPin className='w-12 h-12 text-muted-foreground' />
          </div>
          <div className='space-y-2'>
            <h3 className='text-lg font-semibold'>Select Routes to View</h3>
            <p className='text-muted-foreground'>
              Search for bus routes in the sidebar to view their trips and stops
              on the map.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Main Map and UI Layout
  return (
    <div className='flex-1 flex flex-col space-y-6'>
      {/* Overview Card for Selected Routes */}
      <Card>
        <CardHeader>
          <CardTitle>Selected Routes Overview</CardTitle>
        </CardHeader>
        <CardContent className='space-y-4'>
          {selectedRoutes.map((selectedRoute, routeIndex) => (
            <div key={selectedRoute.name} className='flex items-center gap-3'>
              <Badge
                variant='secondary'
                className='text-lg px-3 py-1'
                // Apply background and text color based on route's assigned color
                style={{
                  backgroundColor:
                    routeColors[routeIndex % routeColors.length] + '20', // Lighter background
                  color: routeColors[routeIndex % routeColors.length], // Solid text color
                }}
              >
                {selectedRoute.name}
              </Badge>
              <h4 className='font-medium text-base leading-none'>
                {selectedRoute.trips.length} Trips
              </h4>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Map Area */}
      <Card className='h-[600px]'>
        <CardContent className='p-0 h-full'>
          <MapContainer
            center={mapCenter} // Initial center of the map
            zoom={mapZoom} // Initial zoom level
            scrollWheelZoom={true} // Enable zooming with mouse wheel
            className='h-full w-full rounded-lg' // Styling for the map container
          >
            {/* MapViewUpdater to re-center the map when mapCenter changes */}
            <MapViewUpdater center={mapCenter} />

            {/* Base Tile Layer (OpenStreetMap) */}
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url='https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
            />

            {/* Marker for User's Current Location */}
            {currentLocation && (
              <Marker
                position={[currentLocation.lat, currentLocation.lng]}
                icon={userLocationIcon} // Use custom icon for user location
              >
                <Popup>Your Current Location</Popup>
              </Marker>
            )}

            {/* Render Polylines for each trip */}
            {allPolylines.map((polylineData, index) => (
              <Polyline
                // Unique key for each polyline
                key={`${polylineData.routeName}-${polylineData.tripId}-${index}`}
                positions={polylineData.positions} // Coordinates for the line
                color={polylineData.color} // Color for the line
                weight={4} // Thickness of the line
                opacity={0.7} // Transparency of the line
              >
                <Popup>
                  <strong>Route: {polylineData.routeName}</strong>
                  <br />
                  Trip:{' '}
                  {polylineData.tripHeadsign ||
                    polylineData.tripId.substring(0, 8)}
                  ...
                </Popup>
              </Polyline>
            ))}

            {/* Render Markers for all unique stops */}
            {allStops.map((stop) => (
              <Marker
                key={stop.id} // Ensure key is a string
                position={[stop.lat as number, stop.lon as number]} // Marker position
                icon={createColoredMarkerIcon(stop.routeColor)} // Use color-coordinated marker
              >
                <Popup>
                  <div className='space-y-1'>
                    <p className='font-semibold'>{stop.name}</p>
                    {stop.arrivalTime && ( // Display arrival time if available on the enriched stop
                      <p className='text-sm text-muted-foreground flex items-center gap-1'>
                        <Clock className='w-3 h-3' />
                        Next: {stop.arrivalTime}
                      </p>
                    )}
                    <p className='text-xs text-muted-foreground flex items-center gap-1'>
                      <Info className='w-3 h-3' />
                      Route: {stop.routeName}
                    </p>
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className='space-y-2'>
        <Button className='w-full'>
          <Star className='w-4 h-4 mr-2' />
          Manage Favorites (for all selected routes)
        </Button>
        <Button variant='outline' className='w-full'>
          <Users className='w-4 h-4 mr-2' />
          Share Map View
        </Button>
      </div>
    </div>
  );
}
