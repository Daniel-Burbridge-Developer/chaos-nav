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

// --- Type definitions for Shape data from API ---
interface ShapeEntry {
  // From shape-info.json
  id: number;
  shape_id: string;
  shape_pt_lat: number;
  shape_pt_lon: number;
  shape_pt_sequence: number;
}

// --- Type definitions for Trip data from API ---
interface RouteInfo {
  // From tripfromroute.json
  route_id: string;
  route_short_name: string | null;
  route_long_name: string | null;
}

interface TripInfo {
  // From tripfromroute.json
  trip_id: string;
  route_id: string;
  trip_headsign: string | null;
  shape_id?: string | null;
}

interface TripResponse {
  // From tripfromroute.json
  route?: RouteInfo;
  trip_ids: string[];
  trips_details?: TripInfo[];
}

// --- Type definition for the response of /api/shape-by-trip/{tripId} ---
interface ShapeIdResponse {
  // From shapebytrip.json
  trip_id: string;
  shape_id: string | null;
}

// --- Type definition for stop_times data ---
// UPDATED: Changed to camelCase to match Drizzle's output
interface StopTimeEntry {
  id: number;
  tripId: string; // Changed from trip_id
  arrivalTime: string; // Changed from arrival_time
  departureTime: string; // Changed from departure_time
  stopId: string; // Changed from stop_id
  stopSequence: number; // Changed from stop_sequence
  pickupType: number | null; // Changed from pickup_type
  dropOffType: number | null; // Changed from drop_off_type
  timepoint: number | null; // Changed from timepoint
  fare: number | null;
  zone: number | null;
  section: number | null;
}

// --- Type definition for busstop-location-data API ---
interface StopLocationEntry {
  id: number;
  name: string;
  number: string; // This is the stop_id
  lat: number;
  lon: number;
  zone_id: number;
}

// --- NEW: Type for frontend headsign selection ---
interface HeadsignTripSelection {
  headsign: string;
  trip_id: string; // The randomly selected trip_id for this headsign
}

// MapViewUpdater component (reused)
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

// --- Data Fetching Function for Trips by Route API ---
const fetchTripsByRoute = async (routeQuery: string): Promise<TripResponse> => {
  console.log(
    `[ShapeMapDisplay] Attempting to fetch trips for route: ${routeQuery}`
  );
  const response = await fetch(`/api/trip-from-route-exact/${routeQuery}`);
  if (!response.ok) {
    const status = response.status;
    const statusText = response.statusText;
    let errorBody: any = {};
    try {
      errorBody = await response.json();
    } catch (e) {
      /* ... */
    }
    console.error(
      `[ShapeMapDisplay] API Error for route "${routeQuery}": HTTP Status: ${status} ${statusText}`,
      errorBody
    );
    throw new Error(
      errorBody.error ||
        errorBody.message ||
        `Failed to fetch trips for route: ${routeQuery} (HTTP ${status})`
    );
  }
  const json: TripResponse = await response.json();
  console.log(
    `[ShapeMapDisplay] Successfully fetched trips for route "${routeQuery}":`,
    json
  );
  return json;
};

// --- Data Fetching Function for Shape ID by Trip ID API ---
const fetchShapeIdByTrip = async (tripId: string): Promise<ShapeIdResponse> => {
  console.log(
    `[ShapeMapDisplay] Attempting to fetch shape_id for trip ID: ${tripId}`
  );
  const response = await fetch(`/api/shape-by-trip/${tripId}`);
  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    const status = response.status;
    console.error(
      `[ShapeMapDisplay] API Error fetching shape_id for trip ID "${tripId}": HTTP ${status}`,
      errorBody
    );
    throw new Error(
      errorBody.error ||
        `Failed to fetch shape_id for trip ID: ${tripId} (HTTP ${status})`
    );
  }
  const json: ShapeIdResponse = await response.json();
  console.log(
    `[ShapeMapDisplay] Successfully fetched shape_id for trip ID "${tripId}":`,
    json
  );
  return json;
};

// --- Data Fetching Function for Shape Points by Shape ID API ---
const fetchShapePointsByShapeId = async (
  shapeId: string
): Promise<ShapeEntry[]> => {
  console.log(
    `[ShapeMapDisplay] Attempting to fetch shape entries for shape ID: ${shapeId}`
  );
  const response = await fetch(`/api/shape-info/${shapeId}`);
  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    const status = response.status;
    console.error(
      `[ShapeMapDisplay] API Error for shape ID "${shapeId}": HTTP ${status}`,
      errorBody
    );
    throw new Error(
      errorBody.error ||
        `Failed to fetch shape data for ID: ${shapeId} (HTTP ${status})`
    );
  }
  const json = await response.json();
  console.log(
    `[ShapeMapDisplay] Successfully fetched shape entries for shape ID "${shapeId}":`,
    json
  );
  if (json.data && Array.isArray(json.data)) {
    return json.data as ShapeEntry[];
  } else {
    console.error(
      `[ShapeMapDisplay] Unexpected response structure for shape ID "${shapeId}", expected { data: array } :`,
      json
    );
    throw new Error(
      `Unexpected data structure from shape-info API for shape ID: ${shapeId}`
    );
  }
};

// --- Data Fetching Function for Stop Times by Trip ID API ---
const fetchStopTimesByTripId = async (
  tripId: string
): Promise<StopTimeEntry[]> => {
  console.log(
    `[ShapeMapDisplay] Attempting to fetch stop times for trip ID: ${tripId}`
  );
  const response = await fetch(`/api/trip-info/${tripId}`);
  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    const status = response.status;
    console.error(
      `[ShapeMapDisplay] API Error fetching stop times for trip ID "${tripId}": HTTP ${status}`,
      errorBody
    );
    throw new Error(
      errorBody.error ||
        `Failed to fetch stop times for trip ID: ${tripId} (HTTP ${status})`
    );
  }
  const json = await response.json();
  console.log(
    `[ShapeMapDisplay] Successfully fetched stop times for trip ID "${tripId}":`,
    json
  );
  // UPDATED: Access the 'data' property from the response
  if (json.data && Array.isArray(json.data)) {
    return json.data as StopTimeEntry[];
  } else {
    console.error(
      `[ShapeMapDisplay] Unexpected response structure for stop times for trip ID "${tripId}", expected { data: array } :`,
      json
    );
    throw new Error(
      `Unexpected data structure from trip-info API for trip ID: ${tripId}`
    );
  }
};

// --- NEW: Data Fetching Function for Stop Location by Stop ID API ---
const fetchStopLocationByStopId = async (
  stopId: string
): Promise<StopLocationEntry> => {
  console.log(
    `[ShapeMapDisplay] Attempting to fetch stop location for stop ID: ${stopId}`
  );
  const response = await fetch(`/api/busstop-location-data/${stopId}`);
  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    const status = response.status;
    console.error(
      `[ShapeMapDisplay] API Error fetching stop location for stop ID "${stopId}": HTTP ${status}`,
      errorBody
    );
    throw new Error(
      errorBody.error ||
        `Failed to fetch stop location for stop ID: ${stopId} (HTTP ${status})`
    );
  }
  const json: StopLocationEntry = await response.json();
  console.log(
    `[ShapeMapDisplay] Successfully fetched stop location for stop ID "${stopId}":`,
    json
  );
  return json;
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
  const [currentRouteQuery, setCurrentRouteQuery] = useState('');

  // NEW: State for frontend-processed headsign selections
  const [headsignSelections, setHeadsignSelections] = useState<
    HeadsignTripSelection[]
  >([]);
  // NEW: State to hold the trip_id selected by the user from the dropdown
  const [selectedTripId, setSelectedTripId] = useState<string | null>(null);

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

  // --- Query 1: Fetch trips by route (This remains the same) ---
  const {
    data: tripsData,
    isLoading: tripsLoading,
    error: tripsError,
  } = useQuery<TripResponse, Error>({
    queryKey: ['trips-by-route', currentRouteQuery],
    queryFn: () => fetchTripsByRoute(currentRouteQuery),
    staleTime: 1000 * 60 * 5,
    enabled: !!currentRouteQuery && geoLocationLoaded, // Only enable if routeQuery is set and geo is loaded
  });

  // --- NEW: Effect to process tripsData and populate headsignSelections ---
  useEffect(() => {
    if (tripsData?.trips_details && tripsData.trips_details.length > 0) {
      const tripsByHeadsign = new Map<string, string[]>();

      tripsData.trips_details.forEach((trip) => {
        const headsign = trip.trip_headsign || 'Unknown Headsign';
        if (!tripsByHeadsign.has(headsign)) {
          tripsByHeadsign.set(headsign, []);
        }
        tripsByHeadsign.get(headsign)?.push(trip.trip_id);
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

  // --- All subsequent queries now depend on 'selectedTripId' ---

  // Query 2: Fetch shape_id using the selected tripId
  const {
    data: shapeIdData,
    isLoading: shapeIdLoading,
    error: shapeIdError,
  } = useQuery<ShapeIdResponse, Error>({
    queryKey: ['shapeId-by-trip', selectedTripId], // Key depends on selectedTripId
    queryFn: () => fetchShapeIdByTrip(selectedTripId!), // Assert non-null because enabled condition
    staleTime: 1000 * 60 * 5,
    enabled: !!selectedTripId && !tripsLoading && geoLocationLoaded, // Only enable if a tripId is selected
  });

  // Determine shape_id for fetching actual shape points
  const actualShapeIdToFetch = shapeIdData?.shape_id || '';

  // Query 3: Fetch shape entries (points) using the fetched shape_id
  const {
    data: shapeEntries,
    isLoading: shapePointsLoading,
    error: shapePointsError,
  } = useQuery<ShapeEntry[], Error>({
    queryKey: ['shape-points', actualShapeIdToFetch],
    queryFn: () => fetchShapePointsByShapeId(actualShapeIdToFetch),
    staleTime: 1000 * 60 * 5,
    enabled: !!actualShapeIdToFetch && !shapeIdLoading && geoLocationLoaded,
  });

  // Query 4: Fetch stop times for the selected tripId
  const {
    data: stopTimesData,
    isLoading: stopTimesLoading,
    error: stopTimesError,
  } = useQuery<StopTimeEntry[], Error>({
    queryKey: ['stop-times', selectedTripId], // Key depends on selectedTripId
    queryFn: () => fetchStopTimesByTripId(selectedTripId!), // Assert non-null
    staleTime: 1000 * 60 * 5,
    enabled: !!selectedTripId && !tripsLoading && geoLocationLoaded, // Only enable if a tripId is selected
  });

  // NEW: Query 5: Fetch stop locations for all unique stop_ids in stopTimesData
  // UPDATED: Changed stop_id to stopId for consistency with StopTimeEntry interface
  const uniqueStopIds = Array.from(
    new Set(stopTimesData?.map((st) => st.stopId) || [])
  );

  const stopLocationsQueries = useQueries({
    queries: uniqueStopIds.map((stopId) => ({
      queryKey: ['stop-location', stopId],
      queryFn: () => fetchStopLocationByStopId(stopId),
      staleTime: 1000 * 60 * 60, // Locations are likely more static, cache longer
      // Only enable if stopTimesData is available AND a trip is selected
      enabled:
        !!stopTimesData &&
        uniqueStopIds.length > 0 &&
        !!selectedTripId &&
        geoLocationLoaded,
    })),
  });

  const stopLocationsData: StopLocationEntry[] = stopLocationsQueries
    .filter((query) => query.isSuccess && query.data)
    .map((query) => query.data as StopLocationEntry);

  const stopLocationsLoading = stopLocationsQueries.some(
    (query) => query.isLoading
  );
  const stopLocationsError = stopLocationsQueries.some(
    (query) => query.isError
  );

  // --- Map Bounds Effect ---
  useEffect(() => {
    if (shapeEntries && shapeEntries.length > 0) {
      const latLngs = shapeEntries.map((entry) => [
        entry.shape_pt_lat,
        entry.shape_pt_lon,
      ]);
      const bounds = L.latLngBounds(latLngs as L.LatLngExpression[]);
      setMapBounds(bounds.isValid() ? bounds : undefined);
    } else {
      setMapBounds(undefined);
    }
  }, [shapeEntries]); // Re-calculate bounds when shapeEntries change

  // --- Form Submission Handler ---
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (routeQueryInput.trim() !== '') {
      setCurrentRouteQuery(routeQueryInput.trim());
      // When a new route is submitted, reset selectedTripId and headsignSelections
      // The useEffect for tripsData will then re-populate them.
      setSelectedTripId(null);
      setHeadsignSelections([]);
    } else {
      setCurrentRouteQuery('');
      setRouteQueryInput('');
      setSelectedTripId(null); // Clear selected trip if query is empty
      setHeadsignSelections([]); // Clear headsigns if query is empty
    }
  };

  // --- Dropdown Selection Handler ---
  const handleHeadsignSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newlySelectedTripId = e.target.value;
    setSelectedTripId(newlySelectedTripId);
    console.log(`User selected headsign for trip_id: ${newlySelectedTripId}`);
  };

  // --- Overall Loading State ---
  const anyLoading =
    tripsLoading ||
    shapeIdLoading ||
    shapePointsLoading ||
    stopTimesLoading ||
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

  // --- REVISED: Combine stop times with actual stop locations ---
  const stopsWithCoords =
    stopTimesData
      ?.map((stopTime) => {
        // UPDATED: Changed stop_id to stopId for consistency with StopTimeEntry interface
        const stopLocation = stopLocationsData.find(
          (loc) => loc.number === stopTime.stopId
        );
        if (stopLocation) {
          return {
            ...stopTime,
            lat: stopLocation.lat,
            lon: stopLocation.lon,
            stop_name: stopLocation.name, // Add stop name from location data
          };
        }
        console.warn(`No location found for stop ID: ${stopTime.stopId}`); // Changed stop_id to stopId
        return null; // Filter out stops for which we couldn't find a location
      })
      .filter(
        (
          stop
        ): stop is StopTimeEntry & {
          lat: number;
          lon: number;
          stop_name: string;
        } => stop !== null
      ) || [];

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
      {currentRouteQuery && tripsData?.route && (
        <h2 className='text-xl font-semibold mb-2'>
          Route: {tripsData.route.route_short_name} -{' '}
          {tripsData.route.route_long_name}
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

      {/* Specific API Errors */}
      {tripsError && !tripsLoading && (
        <div className='p-4 mb-4 text-sm text-red-700 bg-red-100 rounded-lg'>
          Error fetching trips: {tripsError.message}
        </div>
      )}
      {shapeIdError && !shapeIdLoading && selectedTripId && (
        <div className='p-4 mb-4 text-sm text-red-700 bg-red-100 rounded-lg'>
          Error fetching shape identifier for trip {selectedTripId}:{' '}
          {shapeIdError.message}
        </div>
      )}
      {shapePointsError && !shapePointsLoading && actualShapeIdToFetch && (
        <div className='p-4 mb-4 text-sm text-red-700 bg-red-100 rounded-lg'>
          Error fetching shape coordinates for shape ID {actualShapeIdToFetch}:{' '}
          {shapePointsError.message}
        </div>
      )}
      {stopTimesError && !stopTimesLoading && selectedTripId && (
        <div className='p-4 mb-4 text-sm text-red-700 bg-red-100 rounded-lg'>
          Error fetching stop times for trip ID {selectedTripId}:{' '}
          {stopTimesError.message}
        </div>
      )}
      {stopLocationsError &&
        !stopLocationsLoading &&
        uniqueStopIds.length > 0 && (
          <div className='p-4 mb-4 text-sm text-red-700 bg-red-100 rounded-lg'>
            Error fetching stop locations for some stops.
          </div>
        )}

      {/* Data states after loading and without errors */}
      {currentRouteQuery &&
        !anyLoading &&
        !tripsError &&
        !shapeIdError &&
        !shapePointsError &&
        !stopTimesError &&
        !stopLocationsError && (
          <>
            {tripsData && tripsData.trip_ids.length === 0 && (
              <p className='text-yellow-600 mb-2'>
                No trips found for route "{currentRouteQuery}".
              </p>
            )}
            {tripsData &&
              tripsData.trip_ids.length > 0 &&
              (!tripsData.trips_details ||
                tripsData.trips_details.length === 0) && (
                <p className='text-yellow-600 mb-2'>
                  Trips found, but no detailed trip information for route "
                  {currentRouteQuery}".
                </p>
              )}
            {selectedTripId && shapeIdData && !shapeIdData.shape_id && (
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
            {selectedTripId && stopTimesData && stopTimesData.length === 0 && (
              <p className='text-yellow-600 mb-2'>
                No stop times found for trip ID "{selectedTripId}".
              </p>
            )}
            {stopTimesData &&
              stopTimesData.length > 0 &&
              stopsWithCoords.length === 0 && (
                <p className='text-yellow-600 mb-2'>
                  Stop times found, but no corresponding locations could be
                  fetched. Please check the `busstop-location-data` API or if
                  `stopId`s are correct. {/* Changed stop_id to stopId */}
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

        {shapeEntries && shapeEntries.length > 1 && (
          <Polyline
            positions={shapeEntries.map(
              (entry) =>
                [entry.shape_pt_lat, entry.shape_pt_lon] as [number, number]
            )}
            color='purple'
            weight={5}
            opacity={0.8}
          />
        )}

        {/* Render Markers for Stop Times with actual locations */}
        {stopsWithCoords.map((stop, index) => (
          <Marker
            key={`stop-${stop.stopId}-${index}`}
            position={[stop.lat, stop.lon]}
          >
            <Popup>
              <div>
                <strong>Stop Name:</strong> {stop.stop_name || 'N/A'} <br />
                <strong>Stop ID:</strong> {stop.stopId} <br />{' '}
                {/* Changed stop_id to stopId */}
                <strong>Sequence:</strong> {stop.stopSequence} <br />{' '}
                {/* Changed stop_sequence to stopSequence */}
                <strong>Arrival:</strong> {stop.arrivalTime} <br />{' '}
                {/* Changed arrival_time to arrivalTime */}
                <strong>Departure:</strong> {stop.departureTime} <br />{' '}
                {/* Changed departure_time to departureTime */}
                <strong>Pickup Type:</strong> {stop.pickupType} <br />{' '}
                {/* Changed pickup_type to pickupType */}
                <strong>Drop-off Type:</strong> {stop.dropOffType}{' '}
                {/* Changed drop_off_type to dropOffType */}
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
