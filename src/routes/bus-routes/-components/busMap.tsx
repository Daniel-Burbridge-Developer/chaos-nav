// src/components/ShapeMapDisplay.tsx
import React, { useState, useEffect } from 'react';
import {
  MapContainer,
  TileLayer,
  useMap,
  Polyline,
  Marker,
  Popup,
} from 'react-leaflet';
import { LatLngExpression, LatLngBoundsExpression } from 'leaflet';
import { useQuery, useQueries } from '@tanstack/react-query';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix for default marker icon issues with Webpack/bundlers
// @ts-ignore
delete L.Icon.Default.prototype._getIconUrl;

// Ensure default icon paths are set for Leaflet markers
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
});

// --- Type Definitions (Aligned with your Drizzle schemas and new API responses) ---

// Type for a Stop as returned by /api/v1/stop/:stopId
interface StopDetails {
  id: number; // Corresponds to 'number' in your schema, but often referred to as 'id'
  name: string;
  lat: number | null;
  lon: number | null;
  zone_id: string | null;
  supported_modes: string[] | null;
}

// Type for a TripStop as found within the 'stops' JSONB of a Trip schema
interface TripStop {
  id: string; // Corresponds to stop_id
  arrivalTime: string;
  stopSequence: number;
}

// Type for a Trip as returned by /api/v1/trips/by/route/:routeId AND /api/v1/trip/:tripId
// This should match your Drizzle 'Trip' type from schema.ts
interface Trip {
  id: string;
  route_id: string;
  service_id: string;
  direction_id: number | null;
  trip_headsign: string | null;
  shape_id: string | null;
  stops: TripStop[] | null; // This is the JSONB array of TripStop
}

// Type for a ShapePoint as returned by /api/v1/shape/:shapeId
interface ShapePoint {
  lat: number;
  lon: number;
  sequence: number;
}

// Type for frontend headsign selection
interface HeadsignTripSelection {
  headsign: string;
  trip_id: string; // The randomly selected trip_id for this headsign
}

// Type for a stop with its coordinates and name, derived from TripStop and StopDetails
interface StopWithCoords extends TripStop {
  lat: number;
  lon: number;
  stop_name: string;
}

// Type for the Route details returned by /api/v1/routes/:busNumber
interface RouteDetails {
  id: string; // This is the route_id (e.g., "route-85")
  name: string | null; // This is either short_name or long_name
}

// MapViewUpdater component (reused from previous version)
function MapViewUpdater({
  center,
  bounds,
}: {
  center?: LatLngExpression;
  bounds?: LatLngBoundsExpression;
}) {
  const map = useMap();
  useEffect(() => {
    if (bounds) {
      map.fitBounds(bounds, { padding: [50, 50] });
    } else if (center) {
      map.setView(center, map.getZoom());
    }
  }, [center, bounds, map]);
  return null;
}

// --- Data Fetching Functions (Updated to use new API endpoints) ---

/**
 * Fetches route details (including route_id) for a given bus number.
 * Uses the /api/v1/routes/:busNumber endpoint.
 * @param busNumber The user-entered bus number (e.g., "85").
 * @returns A promise resolving to an array of RouteDetails objects.
 */
const fetchRouteDetailsByBusNumber = async (
  busNumber: string
): Promise<RouteDetails[]> => {
  console.log(
    `[ShapeMapDisplay] Fetching route details for bus number: ${busNumber}`
  );
  const response = await fetch(
    `/api/v1/routes/${encodeURIComponent(busNumber)}`
  ); // UPDATED
  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    throw new Error(
      errorBody.error ||
        `Failed to fetch route details for bus number ${busNumber} (HTTP ${response.status})`
    );
  }
  const routes: RouteDetails[] = await response.json();
  console.log(
    `[ShapeMapDisplay] Fetched ${routes.length} route details for bus number "${busNumber}".`
  );
  return routes;
};

/**
 * Fetches trips for a given route ID.
 * Uses the /api/v1/trips-by-route/:routeId endpoint.
 * @param routeId The ID of the route.
 * @returns A promise resolving to an array of Trip objects.
 */
const fetchTripsByRoute = async (routeId: string): Promise<Trip[]> => {
  console.log(`[ShapeMapDisplay] Fetching trips for route ID: ${routeId}`);
  const response = await fetch(
    `/api/v1/trips-by-route/${encodeURIComponent(routeId)}` // UPDATED
  );
  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    throw new Error(
      errorBody.error ||
        `Failed to fetch trips for route ${routeId} (HTTP ${response.status})`
    );
  }
  const trips: Trip[] = await response.json();
  console.log(
    `[ShapeMapDisplay] Fetched ${trips.length} trips for route ID "${routeId}".`
  );
  return trips;
};

/**
 * Fetches a single trip by its ID.
 * Uses the /api/v1/trip/:tripId endpoint.
 * @param tripId The ID of the trip.
 * @returns A promise resolving to a Trip object or null if not found.
 */
const fetchTripById = async (tripId: string): Promise<Trip | null> => {
  console.log(`[ShapeMapDisplay] Fetching trip details for trip ID: ${tripId}`);
  const response = await fetch(`/api/v1/trip/${encodeURIComponent(tripId)}`); // UPDATED
  if (!response.ok) {
    // If 404, it means trip not found, return null instead of throwing error
    if (response.status === 404) {
      console.warn(`[ShapeMapDisplay] Trip ID ${tripId} not found.`);
      return null;
    }
    const errorBody = await response.json().catch(() => ({}));
    throw new Error(
      errorBody.error ||
        `Failed to fetch trip ${tripId} (HTTP ${response.status})`
    );
  }
  const trip: Trip = await response.json();
  console.log(
    `[ShapeMapDisplay] Fetched trip details for trip ID "${tripId}".`
  );
  return trip;
};

/**
 * Fetches shape points for a given shape ID.
 * Uses the /api/v1/shape/:shapeId endpoint.
 * @param shapeId The ID of the shape.
 * @returns A promise resolving to an array of ShapePoint objects.
 */
const fetchShapePointsByShapeId = async (
  shapeId: string
): Promise<ShapePoint[]> => {
  console.log(
    `[ShapeMapDisplay] Fetching shape points for shape ID: ${shapeId}`
  );
  const response = await fetch(`/api/v1/shape/${encodeURIComponent(shapeId)}`); // UPDATED
  if (!response.ok) {
    // If 404, it means shape not found, return empty array
    if (response.status === 404) {
      console.warn(`[ShapeMapDisplay] Shape ID ${shapeId} not found.`);
      return [];
    }
    const errorBody = await response.json().catch(() => ({}));
    throw new Error(
      errorBody.error ||
        `Failed to fetch shape points for shape ID ${shapeId} (HTTP ${response.status})`
    );
  }
  const shapePoints: ShapePoint[] = await response.json();
  // Sort shape points by sequence to ensure correct polyline drawing order
  const sortedShapePoints = shapePoints.sort((a, b) => a.sequence - b.sequence);
  console.log(
    `[ShapeMapDisplay] Fetched ${sortedShapePoints.length} shape points for shape ID "${shapeId}".`
  );
  return sortedShapePoints;
};

/**
 * Fetches stop location details for a given stop ID.
 * Uses the /api/v1/stop/:stopId endpoint.
 * @param stopId The ID of the stop.
 * @returns A promise resolving to a StopDetails object or null if not found.
 */
const fetchStopLocationByStopId = async (
  stopId: string
): Promise<StopDetails | null> => {
  console.log(
    `[ShapeMapDisplay] Fetching stop location for stop ID: ${stopId}`
  );
  const response = await fetch(`/api/v1/stop/${encodeURIComponent(stopId)}`); // UPDATED
  if (!response.ok) {
    // If 404, it means stop not found, return null
    if (response.status === 404) {
      console.warn(`[ShapeMapDisplay] Stop ID ${stopId} not found.`);
      return null;
    }
    const errorBody = await response.json().catch(() => ({}));
    throw new Error(
      errorBody.error ||
        `Failed to fetch stop location for stop ID ${stopId} (HTTP ${response.status})`
    );
  }
  const stopLocation: StopDetails = await response.json();
  console.log(`[ShapeMapDisplay] Fetched location for stop ID "${stopId}".`);
  return stopLocation;
};

// --- ShapeMapDisplay Component ---
type ShapeMapDisplayProps = {
  zoom?: number;
};

export function ShapeMapDisplay({ zoom = 14 }: ShapeMapDisplayProps) {
  const DEFAULT_CENTER: LatLngExpression = [-31.9505, 115.8605]; // Perth CBD
  const [currentCenter, setCurrentCenter] =
    useState<LatLngExpression>(DEFAULT_CENTER);
  const [mapBounds, setMapBounds] = useState<
    LatLngBoundsExpression | undefined
  >(undefined);
  const [geoLocationLoaded, setGeoLocationLoaded] = useState(false);
  const [userError, setUserError] = useState<string | null>(null);

  const [routeQueryInput, setRouteQueryInput] = useState('');
  const [currentRouteQuery, setCurrentRouteQuery] = useState(''); // User's raw bus number input

  // State for frontend-processed headsign selections
  const [headsignSelections, setHeadsignSelections] = useState<
    HeadsignTripSelection[]
  >([]);
  // State to hold the trip_id selected by the user from the dropdown
  const [selectedTripId, setSelectedTripId] = useState<string | null>(null);

  // NEW State to track if the map has already fitted to the current route's initial data
  const [hasFittedToCurrentRoute, setHasFittedToCurrentRoute] = useState(false);

  // --- Geolocation Effect ---
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setCurrentCenter([
            position.coords.latitude,
            position.coords.longitude,
          ]);
          setGeoLocationLoaded(true);
        },
        (err) => {
          console.error('Geolocation error:', err);
          setUserError(err.message || 'Failed to get your location.');
          setCurrentCenter(DEFAULT_CENTER);
          setGeoLocationLoaded(true);
        },
        { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
      );
    } else {
      setUserError('Geolocation is not supported by your browser.');
      setCurrentCenter(DEFAULT_CENTER);
      setGeoLocationLoaded(true);
    }
  }, []); // Run once on component mount

  // --- NEW Query 1: Fetch Route Details (route_id and name) by Bus Number ---
  const {
    data: routeDetailsData, // This will be an array of RouteDetails objects
    isLoading: routeDetailsLoading,
    error: routeDetailsError,
  } = useQuery<RouteDetails[], Error>({
    queryKey: ['route-details', currentRouteQuery],
    queryFn: () => fetchRouteDetailsByBusNumber(currentRouteQuery),
    staleTime: 1000 * 60 * 5,
    enabled: !!currentRouteQuery && geoLocationLoaded, // Only enabled if bus number is provided and geo is loaded
  });

  // Extract the actual route_id to use for fetching trips
  // Assuming the first result is the one we want, or null if no routes found
  const resolvedRouteId =
    routeDetailsData && routeDetailsData.length > 0
      ? routeDetailsData[0].id
      : null;
  const resolvedRouteName =
    routeDetailsData && routeDetailsData.length > 0
      ? routeDetailsData[0].name
      : null;

  // --- Query 2: Fetch trips by RESOLVED route ID ---
  const {
    data: tripsData, // This will be an array of Trip objects
    isLoading: tripsLoading,
    error: tripsError,
  } = useQuery<Trip[], Error>({
    queryKey: ['trips-by-route', resolvedRouteId], // Depends on the resolved route ID
    queryFn: () => fetchTripsByRoute(resolvedRouteId!), // Assert non-null because enabled condition
    staleTime: 1000 * 60 * 5,
    enabled: !!resolvedRouteId && !routeDetailsLoading && geoLocationLoaded, // Only enable if route ID is resolved
  });

  // --- Effect to process tripsData and populate headsignSelections ---
  useEffect(() => {
    if (tripsData && tripsData.length > 0) {
      const tripsByHeadsign = new Map<string, string[]>();

      tripsData.forEach((trip) => {
        const headsign = trip.trip_headsign || 'Unknown Headsign';
        if (!tripsByHeadsign.has(headsign)) {
          tripsByHeadsign.set(headsign, []);
        }
        tripsByHeadsign.get(headsign)?.push(trip.id); // Use trip.id
      });

      const processedSelections: HeadsignTripSelection[] = [];
      tripsByHeadsign.forEach((tripIds, headsign) => {
        // Select a random trip_id for each headsign
        const randomIndex = Math.floor(Math.random() * tripIds.length);
        processedSelections.push({
          headsign: headsign,
          trip_id: tripIds[randomIndex],
        });
      });

      setHeadsignSelections(processedSelections);
      // Automatically select the first headsign's trip_id when data loads
      if (processedSelections.length > 0) {
        setSelectedTripId(processedSelections[0].trip_id);
      } else {
        setSelectedTripId(null); // Clear selection if no headsigns found
      }
    } else {
      setHeadsignSelections([]); // Clear selections if no data
      setSelectedTripId(null);
    }
  }, [tripsData]); // Re-run this effect whenever 'tripsData' changes

  // --- Query 3: Fetch details of the selected trip ---
  const {
    data: selectedTripDetails, // This will be a single Trip object or null
    isLoading: selectedTripLoading,
    error: selectedTripError,
  } = useQuery<Trip | null, Error>({
    queryKey: ['trip-details', selectedTripId],
    queryFn: () => fetchTripById(selectedTripId!), // Assert non-null because enabled condition
    staleTime: 1000 * 60 * 5,
    enabled: !!selectedTripId && !tripsLoading && geoLocationLoaded, // Only enable if a tripId is selected
  });

  // Determine shape_id and stop_ids from the selectedTripDetails
  const actualShapeIdToFetch = selectedTripDetails?.shape_id || '';
  const uniqueStopIdsInSelectedTrip = Array.from(
    new Set(selectedTripDetails?.stops?.map((st) => st.id) || [])
  );

  // --- Query 4: Fetch shape entries (points) using the fetched shape_id ---
  const {
    data: shapeEntries,
    isLoading: shapePointsLoading,
    error: shapePointsError,
  } = useQuery<ShapePoint[], Error>({
    queryKey: ['shape-points', actualShapeIdToFetch],
    queryFn: () => fetchShapePointsByShapeId(actualShapeIdToFetch),
    staleTime: 1000 * 60 * 5,
    enabled:
      !!actualShapeIdToFetch && !selectedTripLoading && geoLocationLoaded,
  });

  // --- Query 5: Fetch stop locations for all unique stop IDs in the selected trip's stops ---
  const stopLocationsQueries = useQueries({
    queries: uniqueStopIdsInSelectedTrip.map((stopId) => ({
      queryKey: ['stop-location', stopId],
      queryFn: () => fetchStopLocationByStopId(stopId),
      staleTime: 1000 * 60 * 60, // Locations are likely more static, cache longer
      enabled:
        !!selectedTripDetails && // Ensure trip details are loaded
        uniqueStopIdsInSelectedTrip.length > 0 &&
        geoLocationLoaded,
    })),
  });

  const stopLocationsData: StopDetails[] = stopLocationsQueries
    .filter((query) => query.isSuccess && query.data)
    .map((query) => query.data as StopDetails);

  const stopLocationsLoading = stopLocationsQueries.some(
    (query) => query.isLoading
  );
  const stopLocationsError = stopLocationsQueries.some(
    (query) => query.isError
  );

  // --- Map Bounds Effect (Adjusted to only fit once per route search) ---
  useEffect(() => {
    // This effect should run when:
    // 1. `resolvedRouteId` changes (new route search)
    // 2. `selectedTripId` becomes available for the *first time* for this `resolvedRouteId`
    // 3. We haven't already fitted the map for this specific `resolvedRouteId`
    // 4. `geoLocationLoaded` is true to ensure map is ready

    if (
      resolvedRouteId &&
      selectedTripId &&
      !hasFittedToCurrentRoute &&
      geoLocationLoaded
    ) {
      // Find the details for the currently selected trip (which is the first one selected by default)
      const tripForBounds = tripsData?.find(
        (trip) => trip.id === selectedTripId
      );

      if (tripForBounds) {
        const fetchAndSetBounds = async () => {
          let combinedLatLngs: LatLngExpression[] = [];

          // Fetch shape points for this trip's shape_id
          if (tripForBounds.shape_id) {
            try {
              const shapeData = await fetchShapePointsByShapeId(
                tripForBounds.shape_id
              );
              combinedLatLngs = shapeData.map((point) => [
                point.lat,
                point.lon,
              ]);
            } catch (e) {
              console.error('Error fetching shape for initial bounds:', e);
            }
          }

          // If no shape points, try to use stop locations from the initial trip's stops
          if (
            combinedLatLngs.length === 0 &&
            tripForBounds.stops &&
            tripForBounds.stops.length > 0
          ) {
            const stopPromises = tripForBounds.stops.map((stop) =>
              fetchStopLocationByStopId(stop.id)
            );
            const fetchedLocs = await Promise.all(stopPromises);
            const validStopLocs = fetchedLocs.filter(
              (loc) => loc && loc.lat !== null && loc.lon !== null
            ) as StopDetails[];
            if (validStopLocs.length > 0) {
              combinedLatLngs = validStopLocs.map((stop) => [
                stop.lat!,
                stop.lon!,
              ]);
            }
          }

          if (combinedLatLngs.length > 0) {
            const bounds = L.latLngBounds(
              combinedLatLngs as L.LatLngExpression[]
            );
            if (bounds.isValid()) {
              setMapBounds(bounds);
              setCurrentCenter(bounds.getCenter());
              setHasFittedToCurrentRoute(true); // Mark as fitted for this route
            }
          }
        };
        fetchAndSetBounds();
      }
    } else if (!resolvedRouteId) {
      // Reset the flag when the route query is cleared
      setHasFittedToCurrentRoute(false);
      setMapBounds(undefined); // Clear bounds
      // Optionally reset center to default/geolocation if no route is selected
      // setCurrentCenter(DEFAULT_CENTER);
    }
  }, [
    resolvedRouteId,
    selectedTripId,
    tripsData,
    hasFittedToCurrentRoute,
    geoLocationLoaded,
  ]); // Dependencies: route ID, initial selected trip ID, trips data, and the flag.

  // --- Form Submission Handler ---
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (routeQueryInput.trim() !== '') {
      setCurrentRouteQuery(routeQueryInput.trim());
      // When a new route is submitted, reset selectedTripId and headsignSelections
      // The useEffect for tripsData will then re-populate them.
      setSelectedTripId(null);
      setHeadsignSelections([]);
      setHasFittedToCurrentRoute(false); // Reset map fit flag for new route
    } else {
      setCurrentRouteQuery('');
      setRouteQueryInput('');
      setSelectedTripId(null); // Clear selected trip if query is empty
      setHeadsignSelections([]); // Clear headsigns if query is empty
      setHasFittedToCurrentRoute(false); // Reset map fit flag if query is empty
    }
  };

  // --- Dropdown Selection Handler ---
  const handleHeadsignSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newlySelectedTripId = e.target.value;
    setSelectedTripId(newlySelectedTripId);
    console.log(`User selected headsign for trip_id: ${newlySelectedTripId}`);
    // Do NOT reset hasFittedToCurrentRoute here, as we don't want to refit the map
  };

  // --- Overall Loading State ---
  const anyLoading =
    routeDetailsLoading || // Added routeDetailsLoading
    tripsLoading ||
    selectedTripLoading ||
    shapePointsLoading ||
    stopLocationsLoading;

  // --- Initial Loading & Error States for Geolocation ---
  if (!geoLocationLoaded && !currentRouteQuery) {
    return (
      <div className='h-[500px] w-full flex items-center justify-center bg-gray-100 rounded-lg shadow'>
        <p className='text-gray-600'>Finding your location...</p>
      </div>
    );
  }
  if (userError) {
    return (
      <div className='h-[500px] w-full flex items-center justify-center bg-red-100 rounded-lg shadow'>
        <p className='text-red-600'>Geolocation Error: {userError}</p>
      </div>
    );
  }

  // --- Specific API Errors ---
  // Added error for routeDetailsError
  if (routeDetailsError && !routeDetailsLoading) {
    return (
      <div className='h-[500px] w-full flex items-center justify-center bg-red-100 rounded-lg shadow'>
        <p className='text-red-600'>
          Error fetching route: {routeDetailsError.message}
        </p>
      </div>
    );
  }

  // If route details loaded but no routes found for the input
  if (
    !routeDetailsLoading &&
    currentRouteQuery &&
    (!routeDetailsData || routeDetailsData.length === 0)
  ) {
    return (
      <div className='h-[500px] w-full flex items-center justify-center bg-yellow-100 rounded-lg shadow'>
        <p className='text-yellow-800'>
          No routes found for "{currentRouteQuery}".
        </p>
      </div>
    );
  }

  // --- Combine stop times from selectedTripDetails with actual stop locations ---
  const stopsWithCoords: StopWithCoords[] =
    selectedTripDetails?.stops
      ?.map((tripStop) => {
        const stopLocation = stopLocationsData.find(
          (loc) => String(loc.id) === tripStop.id
        );
        if (
          stopLocation &&
          stopLocation.lat !== null &&
          stopLocation.lon !== null
        ) {
          return {
            ...tripStop,
            lat: stopLocation.lat,
            lon: stopLocation.lon,
            stop_name: stopLocation.name,
          };
        }
        console.warn(`No location found for stop ID: ${tripStop.id}`);
        return null;
      })
      .filter((stop): stop is StopWithCoords => stop !== null) || [];

  // Prepare polyline positions from shapeEntries
  const polylinePositions: LatLngExpression[] =
    shapeEntries?.map((entry) => [entry.lat, entry.lon]) || [];

  return (
    <div className='p-4'>
      <form className='flex items-center gap-2 mb-4' onSubmit={handleSubmit}>
        <input
          type='text'
          className='border rounded px-3 py-2 w-64'
          placeholder='Enter Bus Route (e.g., 85)'
          value={routeQueryInput}
          onChange={(e) => setRouteQueryInput(e.target.value)}
        />
        <button
          type='submit'
          className='bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700'
          disabled={anyLoading}
        >
          {anyLoading ? 'Loading...' : 'Search Route'}
        </button>
      </form>

      {/* Display Route Info if available */}
      {currentRouteQuery && routeDetailsData && routeDetailsData.length > 0 && (
        <h2 className='text-xl font-semibold mb-2'>
          Route: {resolvedRouteName || resolvedRouteId} ({resolvedRouteId})
        </h2>
      )}

      {/* Headsign Selection Dropdown */}
      {headsignSelections.length > 0 && (
        <div className='mb-4'>
          <label
            htmlFor='headsign-select'
            className='block text-gray-700 text-sm font-bold mb-2'
          >
            Select Destination:
          </label>
          <select
            id='headsign-select'
            className='block appearance-none w-full bg-white border border-gray-400 hover:border-gray-500 px-4 py-2 pr-8 rounded shadow leading-tight focus:outline-none focus:shadow-outline'
            onChange={handleHeadsignSelect}
            value={selectedTripId || ''} // Controlled component
            disabled={anyLoading}
          >
            <option value='' disabled>
              Choose a destination
            </option>
            {headsignSelections.map((selection) => (
              <option key={selection.trip_id} value={selection.trip_id}>
                {selection.headsign}
              </option>
            ))}
          </select>
          {selectedTripId && (
            <p className='text-sm text-gray-500 mt-1'>
              Current Trip ID selected: **{selectedTripId}**
            </p>
          )}
        </div>
      )}

      {currentRouteQuery && anyLoading && (
        <p className='text-gray-600 mb-2'>
          Loading data for route "{currentRouteQuery}"...
        </p>
      )}

      {/* Specific API Errors (after initial route details check) */}
      {!routeDetailsError &&
        !routeDetailsLoading &&
        routeDetailsData &&
        routeDetailsData.length > 0 && (
          <>
            {tripsError && !tripsLoading && (
              <div className='p-4 mb-4 text-sm text-red-700 bg-red-100 rounded-lg'>
                Error fetching trips: {tripsError.message}
              </div>
            )}
            {selectedTripError && !selectedTripLoading && selectedTripId && (
              <div className='p-4 mb-4 text-sm text-red-700 bg-red-100 rounded-lg'>
                Error fetching details for trip {selectedTripId}:{' '}
                {selectedTripError.message}
              </div>
            )}
            {shapePointsError &&
              !shapePointsLoading &&
              actualShapeIdToFetch && (
                <div className='p-4 mb-4 text-sm text-red-700 bg-red-100 rounded-lg'>
                  Error fetching shape coordinates for shape ID{' '}
                  {actualShapeIdToFetch}: {shapePointsError.message}
                </div>
              )}
            {stopLocationsError &&
              !stopLocationsLoading &&
              uniqueStopIdsInSelectedTrip.length > 0 && (
                <div className='p-4 mb-4 text-sm text-red-700 bg-red-100 rounded-lg'>
                  Error fetching stop locations for some stops.
                </div>
              )}
          </>
        )}

      {/* Data states after loading and without errors */}
      {currentRouteQuery &&
        !anyLoading &&
        !tripsError &&
        !selectedTripError &&
        !shapePointsError &&
        !stopLocationsError &&
        !routeDetailsError && // Also check routeDetailsError here
        routeDetailsData &&
        routeDetailsData.length > 0 && ( // Ensure route details were found
          <>
            {tripsData && tripsData.length === 0 && (
              <p className='text-yellow-600 mb-2'>
                No trips found for route "{currentRouteQuery}".
              </p>
            )}
            {selectedTripId && selectedTripDetails === null && (
              <p className='text-yellow-600 mb-2'>
                Trip (ID: "{selectedTripId}") not found or details unavailable.
              </p>
            )}
            {selectedTripDetails && !selectedTripDetails.shape_id && (
              <p className='text-yellow-600 mb-2'>
                Trip (ID: "{selectedTripId}") found, but it has no associated
                shape identifier.
              </p>
            )}
            {actualShapeIdToFetch &&
              shapeEntries &&
              shapeEntries.length === 0 && (
                <p className='text-yellow-600 mb-2'>
                  Shape ID "{actualShapeIdToFetch}" found, but no coordinates
                  are available for this shape.
                </p>
              )}
            {selectedTripDetails &&
              selectedTripDetails.stops &&
              selectedTripDetails.stops.length === 0 && (
                <p className='text-yellow-600 mb-2'>
                  No stop times found for trip ID "{selectedTripId}".
                </p>
              )}
            {selectedTripDetails &&
              selectedTripDetails.stops &&
              selectedTripDetails.stops.length > 0 &&
              stopsWithCoords.length === 0 && (
                <p className='text-yellow-600 mb-2'>
                  Stop times found, but no corresponding locations could be
                  fetched. Please check the `/api/v1/stop` API or if `stopId`s
                  are correct.
                </p>
              )}
          </>
        )}

      <MapContainer
        center={currentCenter}
        zoom={zoom}
        scrollWheelZoom={true}
        className='h-[700px] w-full rounded-lg shadow'
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors'
          url='https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
        />
        <MapViewUpdater center={currentCenter} bounds={mapBounds} />

        {/* Polyline for the route shape */}
        {polylinePositions.length > 1 && (
          <Polyline
            positions={polylinePositions}
            color='purple'
            weight={5}
            opacity={0.8}
          />
        )}

        {/* Markers for Stops with Coordinates */}
        {stopsWithCoords.map((stop, index) => (
          <Marker
            key={`stop-${stop.id}-${index}`} // Use stop.id for unique key
            position={[stop.lat, stop.lon]}
            title={stop.stop_name || `Stop ID: ${stop.id}`}
          >
            <Popup>
              <div>
                <strong>Stop Name:</strong> {stop.stop_name || 'N/A'} <br />
                <strong>Stop ID:</strong> {stop.id} <br />
                <strong>Sequence:</strong> {stop.stopSequence} <br />
                <strong>Arrival:</strong> {stop.arrivalTime} <br />
                {/* Departure, Pickup, Drop-off types are on TripStop, but not used in popup */}
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
