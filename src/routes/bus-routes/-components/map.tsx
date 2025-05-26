import React, { useState, useEffect } from 'react';
import {
  MapContainer,
  TileLayer,
  useMap,
  Marker,
  Popup,
  Polyline,
} from 'react-leaflet';
import { LatLngExpression, LatLngBoundsExpression } from 'leaflet'; // Import LatLngBoundsExpression
import { useQuery } from '@tanstack/react-query';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet'; // Import Leaflet library itself

//@ts-ignore
delete L.Icon.Default.prototype._getIconUrl;

L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
});

type Stop = { id: string; name: string; lat: number; lon: number };

type InteractiveMapProps = {
  zoom?: number;
};

// MapViewUpdater component to handle map view changes
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
      map.fitBounds(bounds);
    } else if (center) {
      map.setView(center, map.getZoom());
    }
  }, [center, bounds, map]);
  return null;
}

// Modified fetchStops to accept a routeNumber parameter
const fetchStops = async (routeNumber: string): Promise<Stop[]> => {
  const response = await fetch(`/api/bus-route/${routeNumber}`);
  if (!response.ok) throw new Error('Failed to fetch stops');
  const json = await response.json();

  const stops: Stop[] = [];

  for (const stop of json.stops) {
    const newRes = await fetch(`/api/busstop-location-data/${stop.id}`);
    if (!newRes.ok) throw new Error('Failed to fetch stop details');
    const stopDetails = await newRes.json();
    stops.push({
      id: stop.id,
      name: stopDetails.name,
      lat: stopDetails.lat,
      lon: stopDetails.lon,
    });
  }

  return stops;
};

export function InteractiveMap({ zoom = 16 }: InteractiveMapProps) {
  const DEFAULT_CENTER: LatLngExpression = [-31.9505, 115.8605];
  const [currentCenter, setCurrentCenter] =
    useState<LatLngExpression>(DEFAULT_CENTER);
  const [mapBounds, setMapBounds] = useState<
    LatLngBoundsExpression | undefined
  >(undefined); // New state for map bounds
  const [geoLocationLoaded, setGeoLocationLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // New state for route input
  const [routeInput, setRouteInput] = useState('85');
  const [routeNumber, setRouteNumber] = useState('85');

  // Geolocation effect
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

  // TanStack Query for stops, refetches when routeNumber changes
  const {
    data: stops,
    isLoading: stopsLoading,
    error: stopsError,
    refetch,
  } = useQuery({
    queryKey: ['bus-route-stops', routeNumber],
    queryFn: () => fetchStops(routeNumber),
    staleTime: 1000 * 60 * 5,
    enabled: geoLocationLoaded,
  });

  // Effect to update map bounds when stops data changes
  useEffect(() => {
    if (stops && stops.length > 0) {
      const latLngs = stops.map((stop) => [stop.lat, stop.lon]);
      const bounds = L.latLngBounds(latLngs as L.LatLngExpression[]);
      setMapBounds(bounds.isValid() ? bounds : undefined); // Set bounds only if valid
      setCurrentCenter(bounds.getCenter()); // Also update current center to the center of the stops
    } else {
      setMapBounds(undefined); // Clear bounds if no stops
    }
  }, [stops]);

  // UI for loading, error, etc.
  if (!geoLocationLoaded) {
    return (
      <div className='h-[500px] w-full flex items-center justify-center bg-gray-100 rounded-lg shadow'>
        <p className='text-gray-600'>Finding your location...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className='h-[500px] w-full flex items-center justify-center bg-red-100 rounded-lg shadow'>
        <p className='text-red-600'>
          {error || 'Failed to load map or stops.'}
        </p>
      </div>
    );
  }

  if (stopsLoading) {
    return (
      <div className='h-[500px] w-full flex items-center justify-center bg-gray-100 rounded-lg shadow'>
        <p className='text-gray-600'>Loading bus stops...</p>
      </div>
    );
  }

  if (stopsError) {
    return (
      <div className='h-[500px] w-full flex items-center justify-center bg-red-100 rounded-lg shadow'>
        <p className='text-red-600'>
          {stopsError?.message || 'Failed to load bus stops.'}
        </p>
      </div>
    );
  }

  return (
    <div>
      {/* Input box for route number */}
      <form
        className='flex items-center gap-2 mb-4'
        onSubmit={(e) => {
          e.preventDefault();
          setRouteNumber(routeInput);
          refetch();
        }}
      >
        <input
          type='number'
          min='1'
          className='border rounded px-3 py-2'
          placeholder='Enter route number'
          value={routeInput}
          onChange={(e) => setRouteInput(e.target.value)}
        />
        <button
          type='submit'
          className='bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700'
        >
          Search
        </button>
      </form>
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
        {stops && stops.length > 1 && (
          <Polyline
            positions={stops.map(
              (stop) => [stop.lat, stop.lon] as [number, number]
            )}
            color='blue'
            weight={4}
          />
        )}
        {stops &&
          stops.map((stop) => (
            <Marker
              key={stop.id}
              position={[stop.lat, stop.lon]}
              title={stop.name}
            >
              <Popup>
                <div className='text-center'>
                  <h3 className='font-semibold'>{stop.name}</h3>
                  <p className='text-sm text-gray-500'>Stop ID: {stop.id}</p>
                </div>
              </Popup>
            </Marker>
          ))}
      </MapContainer>
    </div>
  );
}
