import { useState, useEffect } from 'react';
import {
  MapContainer,
  TileLayer,
  useMap,
  Polyline,
  Marker,
  Popup,
} from 'react-leaflet';
import { LatLngExpression, LatLngBoundsExpression } from 'leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { useSelectedRoutesStore } from '~/stores/selectedRoutesStore';
import { MapPin } from 'lucide-react';
import type { SelectedRoute } from '~/stores/selectedRoutesStore';
import { Trip, TripStop } from '~/db/schema/trips';
import { Stop } from '~/db/schema/stops';
import { routeTree } from 'app/routeTree.gen';

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

const extractTrips = (route: SelectedRoute): Trip[] => {
  return route.trips;
};
const extractStops = (trip: Trip): TripStop[] => {
  return trip.stops || [];
};

export const MapCanvas = () => {
  const { selectedRoutes } = useSelectedRoutesStore();

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

  return (
    <div>
      {selectedRoutes.map((route) => (
        <div key={route.name}>
          {extractTrips(route).map((trip) =>
            extractStops(trip).map((stop) => <h1 key={stop.id}>{stop.id}</h1>)
          )}
        </div>
      ))}
    </div>
  );
};

export default MapCanvas;
