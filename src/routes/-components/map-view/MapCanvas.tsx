import { useState, useEffect, useMemo } from 'react';
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
import { useQuery } from '@tanstack/react-query';

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

// Define a set of distinct colors for *individual trips*
const ROUTE_COLORS = [
  '#E60000', // Red
  '#008000', // Green
  '#0000FF', // Blue
  '#FFA500', // Orange
  '#800080', // Purple
  '#00CED1', // DarkTurquoise
  '#FF1493', // DeepPink
  '#4B0082', // Indigo
  '#B8860B', // DarkGoldenRod
  '#FF4500', // OrangeRed
  '#2E8B57', // SeaGreen
  '#1E90FF', // DodgerBlue
  '#FFD700', // Gold (added more colors for more trips)
  '#ADFF2F', // GreenYellow
  '#9932CC', // DarkOrchid
  '#8B0000', // DarkRed
  '#006400', // DarkGreen
  '#4682B4', // SteelBlue
  '#FF6347', // Tomato
  '#7B68EE', // MediumSlateBlue
  '#00FA9A', // MediumSpringGreen
  '#DC143C', // Crimson
  '#F0E68C', // Khaki
];

// Helper functions (pure functions, no hooks)
const extractTrips = (route: SelectedRoute): Trip[] => route.trips;
const extractStops = (trip: Trip): TripStop[] => trip.stops || [];

// --- TanStack Query Hook Definition ---
interface StopLocation {
  id: string;
  lat: number;
  lon: number;
  name: string;
}

const fetchStopById = async (stopId: string): Promise<Stop | null> => {
  const response = await fetch(`/api/v1/stop/${stopId}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch stop ${stopId}: ${response.statusText}`);
  }
  return response.json();
};

const useStopLocations = (stopIds: string[]) => {
  return useQuery<StopLocation[], Error>({
    queryKey: ['stopLocations', stopIds],
    queryFn: async () => {
      const uniqueStopIds = Array.from(new Set(stopIds.filter((id) => id)));

      if (uniqueStopIds.length === 0) {
        return [];
      }

      const results = await Promise.all(
        uniqueStopIds.map((id) => fetchStopById(id))
      );

      return results
        .filter(
          (stop): stop is Stop =>
            stop !== null && stop.lat != null && stop.lon != null
        )
        .map((stop) => ({
          id: String(stop.id),
          lat: stop.lat,
          lon: stop.lon,
          name: stop.name,
        }));
    },
    enabled: stopIds.length > 0, // This internal 'enabled' prop correctly handles no stopIds
    staleTime: 1000 * 60 * 5,
    cacheTime: 1000 * 60 * 10,
  });
};

// --- Map Updater Component Definition ---
interface MapUpdaterProps {
  positions: LatLngExpression[];
}

const MapUpdater = ({ positions }: MapUpdaterProps) => {
  const map = useMap(); // Hook call

  useEffect(() => {
    // Hook call
    if (positions.length > 0) {
      const bounds = L.latLngBounds(positions);
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [positions, map]);

  return null;
};

// --- Individual Trip Polyline Component Definition ---
interface TripPolylineIndividualProps {
  trip: Trip;
  color: string;
  stopLocations: StopLocation[];
}

const TripPolylineIndividual = ({
  trip,
  color,
  stopLocations,
}: TripPolylineIndividualProps) => {
  const tripPolyline: LatLngExpression[] = useMemo(() => {
    const polyline: LatLngExpression[] = [];
    const tripStops = extractStops(trip);

    tripStops.forEach((tripStop) => {
      const stopDetail = stopLocations.find((sl) => sl.id === tripStop.id);
      if (stopDetail) {
        polyline.push([stopDetail.lat, stopDetail.lon]);
      }
    });
    return polyline;
  }, [trip, stopLocations]);

  if (tripPolyline.length < 2) {
    return null;
  }

  return (
    <Polyline
      key={`trip-polyline-${trip.id}`}
      positions={tripPolyline}
      color={color}
      weight={4}
    />
  );
};

// --- All Trips Polyline Layer Component Definition ---
interface AllTripsPolylineLayerProps {
  trips: { trip: Trip; color: string }[];
  stopLocations: StopLocation[];
}

const AllTripsPolylineLayer = ({
  trips,
  stopLocations,
}: AllTripsPolylineLayerProps) => {
  if (!stopLocations || stopLocations.length === 0 || trips.length === 0) {
    return null; // Return null if no data to render polylines
  }

  return (
    <>
      {trips.map(({ trip, color }) => (
        <TripPolylineIndividual
          key={`trip-individual-${trip.id}`}
          trip={trip}
          color={color}
          stopLocations={stopLocations}
        />
      ))}
    </>
  );
};

// --- Unique Stop Marker Renderer Component Definition ---
interface UniqueStopMarkerRendererProps {
  stopLocations: StopLocation[];
}

const UniqueStopMarkerRenderer = ({
  stopLocations,
}: UniqueStopMarkerRendererProps) => {
  const markers = useMemo(() => {
    const uniqueMarkersList: {
      position: LatLngExpression;
      popupContent: string;
      stopId: string;
    }[] = [];
    const addedMarkerStopIds = new Set<string>();

    stopLocations.forEach((stopDetail) => {
      if (!addedMarkerStopIds.has(stopDetail.id)) {
        uniqueMarkersList.push({
          position: [stopDetail.lat, stopDetail.lon],
          popupContent: `Stop: ${stopDetail.name} (ID: ${stopDetail.id})`,
          stopId: stopDetail.id,
        });
        addedMarkerStopIds.add(stopDetail.id);
      }
    });
    return uniqueMarkersList;
  }, [stopLocations]);

  if (markers.length === 0) {
    return null; // No markers to render
  }

  return (
    <>
      {markers.map((marker) => (
        <Marker
          key={`overall-stop-marker-${marker.stopId}`}
          position={marker.position}
        >
          <Popup>{marker.popupContent}</Popup>
        </Marker>
      ))}
    </>
  );
};

// --- Main Map Canvas Component ---
export const MapCanvas = () => {
  // ALL HOOKS MUST BE CALLED UNCONDITIONALLY AT THE TOP LEVEL
  // This ensures the same number and order of hook calls on every render.

  const { selectedRoutes } = useSelectedRoutesStore(); // Hook 1: Always called.

  // Prepare allStopIds. This useMemo is always called.
  const allStopIds = useMemo(() => {
    // If selectedRoutes is empty, this will correctly return an empty array,
    // but the useMemo itself is always executed.
    return Array.from(
      new Set(
        selectedRoutes.flatMap((route) =>
          extractTrips(route).flatMap((trip) =>
            extractStops(trip).map((stop) => stop.id)
          )
        )
      )
    );
  }, [selectedRoutes]);

  // Fetch stop locations. This useQuery is always called.
  const {
    data: stopLocations,
    isLoading,
    isError,
    error,
  } = useStopLocations(allStopIds); // `enabled` prop inside `useStopLocations` handles fetching logic.

  // Prepare trips with colors. This useMemo is always called.
  const tripsToRender = useMemo(() => {
    const tripsWithColors: { trip: Trip; color: string }[] = [];
    let colorIndex = 0;

    selectedRoutes.forEach((route) => {
      extractTrips(route).forEach((trip) => {
        const color = ROUTE_COLORS[colorIndex % ROUTE_COLORS.length];
        tripsWithColors.push({ trip, color });
        colorIndex++;
      });
    });
    return tripsWithColors;
  }, [selectedRoutes]);

  // Calculate all map positions. This useMemo is always called.
  const allMapPositions: LatLngExpression[] = useMemo(() => {
    // Logic inside can be conditional, but the hook call itself is not.
    if (!stopLocations) return [];
    const positions: LatLngExpression[] = [];
    tripsToRender.forEach(({ trip }) => {
      extractStops(trip).forEach((tripStop) => {
        const stopDetail = stopLocations.find((sl) => sl.id === tripStop.id);
        if (stopDetail) {
          positions.push([stopDetail.lat, stopDetail.lon]);
        }
      });
    });
    return positions;
  }, [tripsToRender, stopLocations]);

  // --- NOW, WE CAN HAVE CONDITIONAL UI RENDERING BASED ON THE RESULTS OF HOOKS ---

  // Display a message if no routes are selected
  // This is a UI-level conditional, not a hook-level conditional.
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

  // Display loading state
  if (isLoading) {
    return (
      <div className='flex-1 flex items-center justify-center'>
        <p className='text-muted-foreground'>Loading map data...</p>
      </div>
    );
  }

  // Display error state
  if (isError) {
    return (
      <div className='flex-1 flex items-center justify-center'>
        <p className='text-red-500'>Error loading map data: {error?.message}</p>
      </div>
    );
  }

  // --- Render the Leaflet map with all components ---
  return (
    <MapContainer
      center={allMapPositions.length > 0 ? allMapPositions[0] : [51.505, -0.09]}
      zoom={13}
      scrollWheelZoom={true}
      style={{ height: '100%', width: '100%', flexGrow: 1 }}
      className='z-0'
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url='https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
      />

      {/* All map layer components are now rendered unconditionally by MapCanvas.
          They handle their own internal rendering based on props/data. */}
      <AllTripsPolylineLayer
        trips={tripsToRender}
        stopLocations={stopLocations || []}
      />

      <UniqueStopMarkerRenderer stopLocations={stopLocations || []} />

      <MapUpdater positions={allMapPositions} />
    </MapContainer>
  );
};

export default MapCanvas;
