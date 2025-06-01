// src/components/ShapeMapDisplay.tsx
import React, { useState, useEffect } from 'react';
import {
  MapContainer,
  TileLayer,
  useMap,
  // Marker, // REMOVED: No longer needed
  // Popup,  // REMOVED: No longer needed
  Polyline,
} from 'react-leaflet';
import { LatLngExpression, LatLngBoundsExpression } from 'leaflet';
import { useQuery } from '@tanstack/react-query';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix for default marker icon issues with Webpack/bundlers
// @ts-ignore
delete L.Icon.Default.prototype._getIconUrl;

// REMOVED: No longer need to set default marker options if no markers are used
// L.Icon.Default.mergeOptions({
//   iconRetinaUrl:
//     'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
//   iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
//   shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
// });

// --- Type definitions for Shape data from our API ---
interface ShapeEntry {
  id: number; // This is the primary key from your DB (not the shape_id)
  shape_id: string;
  shape_pt_lat: number;
  shape_pt_lon: number;
  shape_pt_sequence: number;
}

// MapViewUpdater component (reused from your example)
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
      map.fitBounds(bounds, { padding: [50, 50] }); // Add some padding for better fit
    } else if (center) {
      map.setView(center, map.getZoom());
    }
  }, [center, bounds, map]);
  return null;
}

// --- Data Fetching Function for Shape API ---
const fetchShapeEntries = async (shapeId: string): Promise<ShapeEntry[]> => {
  // Use the API endpoint we just created
  const response = await fetch(`/api/shape-info/${shapeId}`);
  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({})); // Try to parse error body
    throw new Error(
      errorBody.error || `Failed to fetch shape data for ID: ${shapeId}`
    );
  }
  const json = await response.json();
  return json.data; // The API returns { data: [...] }
};

// --- ShapeMapDisplay Component ---
type ShapeMapDisplayProps = {
  zoom?: number;
};

export function ShapeMapDisplay({ zoom = 14 }: ShapeMapDisplayProps) {
  const DEFAULT_CENTER: LatLngExpression = [-31.9505, 115.8605]; // Center for Perth, WA
  const [currentCenter, setCurrentCenter] =
    useState<LatLngExpression>(DEFAULT_CENTER);
  const [mapBounds, setMapBounds] = useState<
    LatLngBoundsExpression | undefined
  >(undefined);
  const [geoLocationLoaded, setGeoLocationLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // State for the shape_id input
  const [shapeIdInput, setShapeIdInput] = useState(''); // Initial empty string
  const [currentShapeId, setCurrentShapeId] = useState(''); // The shape_id currently being queried

  // Geolocation effect (optional, can be removed if you always want to center on shapes)
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
          setError(err.message || 'Failed to get your location.');
          setCurrentCenter(DEFAULT_CENTER);
          setGeoLocationLoaded(true);
        },
        { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
      );
    } else {
      setError('Geolocation is not supported by your browser.');
      setCurrentCenter(DEFAULT_CENTER);
      setGeoLocationLoaded(true);
    }
  }, []);

  // TanStack Query for shape entries
  const {
    data: shapeEntries,
    isLoading: shapesLoading,
    error: shapesError,
    // refetch, // refetch is implicitly called when currentShapeId changes
  } = useQuery<ShapeEntry[], Error>({
    queryKey: ['shape-data', currentShapeId],
    queryFn: () => fetchShapeEntries(currentShapeId),
    staleTime: 1000 * 60 * 5, // 5 minutes cache for data
    enabled: !!currentShapeId && geoLocationLoaded, // Only enabled if shapeId is present and geolocation is loaded
  });

  // Effect to update map bounds when shape data changes
  useEffect(() => {
    if (shapeEntries && shapeEntries.length > 0) {
      const latLngs = shapeEntries.map((entry) => [
        entry.shape_pt_lat,
        entry.shape_pt_lon,
      ]);
      const bounds = L.latLngBounds(latLngs as L.LatLngExpression[]);
      setMapBounds(bounds.isValid() ? bounds : undefined);
      // Optional: If you want to always center the map on the shapes regardless of geolocation
      // setCurrentCenter(bounds.getCenter());
    } else {
      setMapBounds(undefined); // Clear bounds if no shape entries
      // If no shapes, optionally reset center to default or current user location
      // setCurrentCenter(geoLocationLoaded ? currentCenter : DEFAULT_CENTER);
    }
  }, [shapeEntries, geoLocationLoaded]);

  // Handler for form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (shapeIdInput.trim() !== '') {
      setCurrentShapeId(shapeIdInput.trim());
    } else {
      setCurrentShapeId(''); // Clear results if input is empty
      setShapeIdInput(''); // Reset input
    }
  };

  // --- UI Render Logic ---
  if (!geoLocationLoaded) {
    return (
      <div className='h-[500px] w-full flex items-center justify-center bg-gray-100 rounded-lg shadow'>
        <p className='text-gray-600'>
          Finding your location for initial map view...
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className='h-[500px] w-full flex items-center justify-center bg-red-100 rounded-lg shadow'>
        <p className='text-red-600'>
          {error || 'Failed to load map or shapes.'}
        </p>
      </div>
    );
  }

  return (
    <div>
      {/* Input box for shape ID */}
      <form className='flex items-center gap-2 mb-4' onSubmit={handleSubmit}>
        <input
          type='text' // shape_id is TEXT, so type='text'
          className='border rounded px-3 py-2 w-64' // Added fixed width for better UI
          placeholder='Enter Shape ID (e.g., 67295)'
          value={shapeIdInput}
          onChange={(e) => setShapeIdInput(e.target.value)}
        />
        <button
          type='submit'
          className='bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700'
          disabled={shapesLoading} // Disable button while loading
        >
          {shapesLoading ? 'Loading...' : 'Search Shape'}
        </button>
      </form>

      {/* Loading/Error Messages for Shape Data */}
      {currentShapeId && shapesLoading && (
        <p className='text-gray-600 mb-2'>
          Loading shape data for "{currentShapeId}"...
        </p>
      )}
      {shapesError && (
        <p className='text-red-600 mb-2'>
          Error fetching shape data: {shapesError.message}
        </p>
      )}
      {currentShapeId &&
        !shapesLoading &&
        !shapesError &&
        (!shapeEntries || shapeEntries.length === 0) && (
          <p className='text-yellow-600 mb-2'>
            No shape entries found for ID "{currentShapeId}".
          </p>
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
        {/* Pass both center and bounds to MapViewUpdater */}
        <MapViewUpdater center={currentCenter} bounds={mapBounds} />

        {/* Render Polyline */}
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

        {/* REMOVED: Markers are no longer rendered */}
        {/* {shapeEntries &&
          shapeEntries.map((entry) => (
            <Marker
              key={entry.id}
              position={[entry.shape_pt_lat, entry.shape_pt_lon]}
              title={`Shape ID: ${entry.shape_id}, Seq: ${entry.shape_pt_sequence}`}
            >
              <Popup>
                <div className='text-center'>
                  <h3 className='font-semibold'>Shape Point</h3>
                  <p className='text-sm'>Shape ID: {entry.shape_id}</p>
                  <p className='text-sm'>Sequence: {entry.shape_pt_sequence}</p>
                  <p className='text-sm'>Lat: {entry.shape_pt_lat.toFixed(6)}</p>
                  <p className='text-sm'>Lon: {entry.shape_pt_lon.toFixed(6)}</p>
                </div>
              </Popup>
            </Marker>
          ))} */}
      </MapContainer>
    </div>
  );
}
