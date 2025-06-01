// src/components/ShapeMapDisplay.tsx
import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, useMap, Polyline } from 'react-leaflet';
import { LatLngExpression, LatLngBoundsExpression } from 'leaflet';
import { useQuery } from '@tanstack/react-query';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix for default marker icon issues with Webpack/bundlers
// @ts-ignore
delete L.Icon.Default.prototype._getIconUrl;

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
  shape_id?: string | null; // shape_id is not directly in trips_details in the sample, making it optional
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
  shape_id: string | null; // Shape ID might be null if a trip has no shape
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
  const json = await response.json(); // Expects { data: [...] } from shape-info.json
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

// --- ShapeMapDisplay Component ---
type ShapeMapDisplayProps = {
  zoom?: number;
};

export function ShapeMapDisplay({ zoom = 14 }: ShapeMapDisplayProps) {
  const DEFAULT_CENTER: LatLngExpression = [-31.9505, 115.8605];
  const [currentCenter, setCurrentCenter] =
    useState<LatLngExpression>(DEFAULT_CENTER);
  const [mapBounds, setMapBounds] = useState<
    LatLngBoundsExpression | undefined
  >(undefined);
  const [geoLocationLoaded, setGeoLocationLoaded] = useState(false);
  const [userError, setUserError] = useState<string | null>(null); // For geolocation errors specifically

  const [routeQueryInput, setRouteQueryInput] = useState('');
  const [currentRouteQuery, setCurrentRouteQuery] = useState('');

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
  }, []);

  // Query 1: Fetch trips by route
  const {
    data: tripsData,
    isLoading: tripsLoading,
    error: tripsError,
  } = useQuery<TripResponse, Error>({
    queryKey: ['trips-by-route', currentRouteQuery],
    queryFn: () => fetchTripsByRoute(currentRouteQuery),
    staleTime: 1000 * 60 * 5,
    enabled: !!currentRouteQuery && geoLocationLoaded,
  });

  // Determine tripId for fetching its associated shape_id
  const tripIdForShapeIdFetch = tripsData?.trips_details?.[0]?.trip_id || '';

  // Query 2: Fetch shape_id using tripId
  const {
    data: shapeIdData,
    isLoading: shapeIdLoading,
    error: shapeIdError,
  } = useQuery<ShapeIdResponse, Error>({
    queryKey: ['shapeId-by-trip', tripIdForShapeIdFetch],
    queryFn: () => fetchShapeIdByTrip(tripIdForShapeIdFetch),
    staleTime: 1000 * 60 * 5,
    enabled: !!tripIdForShapeIdFetch && !tripsLoading && geoLocationLoaded,
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
  }, [shapeEntries]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (routeQueryInput.trim() !== '') {
      setCurrentRouteQuery(routeQueryInput.trim());
    } else {
      setCurrentRouteQuery('');
      setRouteQueryInput('');
    }
  };

  const anyLoading = tripsLoading || shapeIdLoading || shapePointsLoading;

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

  return (
    <div>
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
      {shapeIdError && !shapeIdLoading && tripIdForShapeIdFetch && (
        <div className='p-4 mb-4 text-sm text-red-700 bg-red-100 rounded-lg'>
          Error fetching shape identifier for trip {tripIdForShapeIdFetch}:{' '}
          {shapeIdError.message}
        </div>
      )}
      {shapePointsError && !shapePointsLoading && actualShapeIdToFetch && (
        <div className='p-4 mb-4 text-sm text-red-700 bg-red-100 rounded-lg'>
          Error fetching shape coordinates for shape ID {actualShapeIdToFetch}:{' '}
          {shapePointsError.message}
        </div>
      )}

      {/* Data states after loading and without errors */}
      {currentRouteQuery &&
        !anyLoading &&
        !tripsError &&
        !shapeIdError &&
        !shapePointsError && (
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
            {tripIdForShapeIdFetch && shapeIdData && !shapeIdData.shape_id && (
              <p className='text-yellow-600 mb-2'>
                Trip (ID: "{tripIdForShapeIdFetch}") found, but it has no
                associated shape identifier.
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
      </MapContainer>
    </div>
  );
}
