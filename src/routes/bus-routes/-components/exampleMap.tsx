import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import { LatLngExpression, LatLng } from 'leaflet'; // Import LatLng from Leaflet

// Add this at the top of your map component file, or a global client-side entry file
import L from 'leaflet';

// Fix for default marker icon issues with Webpack/Vite
//@ts-ignore
// delete L.Icon.Default.prototype._getIconUrl;

L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
});

type InteractiveMapProps = {
  center: LatLngExpression;
  zoom?: number;
  markers?: { position: LatLngExpression; label: string }[];
};

function MapInteractions({
  setFoundLocation,
}: {
  setFoundLocation: (latlng: LatLng) => void;
}) {
  const map = useMap();
  const [findingLocation, setFindingLocation] = useState(false);

  useEffect(() => {
    // Event listener for when location is found
    map.on('locationfound', (e) => {
      setFoundLocation(e.latlng);
      map.flyTo(e.latlng, map.getZoom()); // Fly to the new location
      setFindingLocation(false);
    });

    // Event listener for when location is not found (e.g., user denies permission)
    map.on('locationerror', (e) => {
      alert(e.message); // Display the error message to the user
      setFindingLocation(false);
    });

    // Clean up event listeners on unmount
    return () => {
      map.off('locationfound');
      map.off('locationerror');
    };
  }, [map, setFoundLocation]);

  const handleLocateMe = () => {
    setFindingLocation(true);
    map.locate({ setView: false, maxZoom: 16, enableHighAccuracy: true }); // setView: false allows us to control the view with flyTo
  };

  return (
    <div style={{ position: 'absolute', top: 10, right: 10, zIndex: 1000 }}>
      <button
        onClick={handleLocateMe}
        disabled={findingLocation}
        style={{
          padding: '8px 12px',
          backgroundColor: '#007bff',
          color: 'white',
          border: 'none',
          borderRadius: '5px',
          cursor: 'pointer',
          fontSize: '14px',
          opacity: findingLocation ? 0.7 : 1,
        }}
      >
        {findingLocation ? 'Locating...' : 'Find My Location'}
      </button>
    </div>
  );
}

export function InteractiveMap({
  center: initialCenter, // Rename to avoid conflict with state
  zoom = 13,
  markers = [],
}: InteractiveMapProps) {
  const [currentCenter, setCurrentCenter] =
    useState<LatLngExpression>(initialCenter);
  const [userLocationMarker, setUserLocationMarker] =
    useState<LatLngExpression | null>(null);

  const handleLocationFound = (latlng: LatLng) => {
    setCurrentCenter(latlng);
    setUserLocationMarker(latlng);
  };

  return (
    <MapContainer
      center={currentCenter}
      zoom={zoom}
      scrollWheelZoom={true}
      className='h-[500px] w-full rounded-lg shadow'
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors'
        url='https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
      />
      {markers.map((marker, index) => (
        <Marker key={`custom-marker-${index}`} position={marker.position}>
          <Popup>{marker.label}</Popup>
        </Marker>
      ))}
      {userLocationMarker && (
        <Marker position={userLocationMarker}>
          <Popup>You are here!</Popup>
        </Marker>
      )}
      <MapInteractions setFoundLocation={handleLocationFound} />
    </MapContainer>
  );
}
