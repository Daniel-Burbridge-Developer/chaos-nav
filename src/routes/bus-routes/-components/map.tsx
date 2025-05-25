import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, useMap } from 'react-leaflet';
import { LatLngExpression, LatLng } from 'leaflet'; // Import LatLng from Leaflet
import 'leaflet/dist/leaflet.css';

type InteractiveMapProps = {
  zoom?: number;
};

// Component to handle map view updates
function MapViewUpdater({ center }: { center: LatLngExpression }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, map.getZoom());
  }, [center, map]); // Only re-run if center changes
  return null; // This component doesn't render anything itself
}

export function InteractiveMap({ zoom = 13 }: InteractiveMapProps) {
  // Default to Perth, Western Australia
  const DEFAULT_CENTER: LatLngExpression = [-31.9505, 115.8605]; // Perth, Western Australia
  const [currentCenter, setCurrentCenter] =
    useState<LatLngExpression>(DEFAULT_CENTER);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          // Success: Use user's location
          setCurrentCenter([
            position.coords.latitude,
            position.coords.longitude,
          ]);
          setLoading(false);
        },
        (err) => {
          // Error: Geolocation failed or permission denied
          console.error('Geolocation error:', err);
          setError(err.message || 'Failed to get your location.');
          setCurrentCenter(DEFAULT_CENTER); // Fallback to default
          setLoading(false);
        },
        { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 } // Options for getCurrentPosition
      );
    } else {
      // Geolocation not supported by browser
      setError('Geolocation is not supported by your browser.');
      setCurrentCenter(DEFAULT_CENTER); // Fallback to default
      setLoading(false);
    }
  }, []); // Empty dependency array means this runs once on mount

  if (loading) {
    return (
      <div className='h-[500px] w-full flex items-center justify-center bg-gray-100 rounded-lg shadow'>
        <p className='text-gray-600'>Finding your location...</p>
      </div>
    );
  }

  if (error && currentCenter === DEFAULT_CENTER) {
    // Optionally show an error if it fell back to default due to an error
    console.warn('Map loaded with default center due to:', error);
  }

  return (
    <MapContainer
      center={currentCenter} // Use the state-managed center
      zoom={zoom}
      scrollWheelZoom={true}
      className='h-[500px] w-full rounded-lg shadow'
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors'
        url='https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
      />
      {/* This component ensures the map view updates when currentCenter changes */}
      <MapViewUpdater center={currentCenter} />
    </MapContainer>
  );
}
