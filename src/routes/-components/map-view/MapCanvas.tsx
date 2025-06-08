import { useState, useEffect, useMemo } from "react";
import {
  MapContainer,
  TileLayer,
  useMap,
  Polyline,
  Marker,
  Popup,
} from "react-leaflet";
import { LatLngExpression, LatLngBoundsExpression } from "leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { useSelectedRoutesStore } from "~/stores/selectedRoutesStore";
import { MapPin } from "lucide-react";
import type { SelectedRoute } from "~/stores/selectedRoutesStore";
import { Trip, TripStop } from "~/db/schema/trips"; // Assuming Trip now includes shapeId
import { Stop } from "~/db/schema/stops";
import { useQuery } from "@tanstack/react-query";

// Fix for default marker icon issues with Webpack/bundlers
// @ts-ignore
delete L.Icon.Default.prototype._getIconUrl;

// Ensure default icon paths are set for Leaflet markers
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png",
});

// Define a set of distinct colors for *individual trips* ~~
const ROUTE_COLORS = [
  "#E60000", // Red
  "#008000", // Green
  "#0000FF", // Blue
  "#FFA500", // Orange
  "#800080", // Purple
  "#00CED1", // DarkTurquoise
  "#FF1493", // DeepPink
  "#4B0082", // Indigo
  "#B8860B", // DarkGoldenRod
  "#FF4500", // OrangeRed
  "#2E8B57", // SeaGreen
  "#1E90FF", // DodgerBlue
  "#FFD700", // Gold (added more colors for more trips)
  "#ADFF2F", // GreenYellow
  "#9932CC", // DarkOrchid
  "#8B0000", // DarkRed
  "#006400", // DarkGreen
  "#4682B4", // SteelBlue
  "#FF6347", // Tomato
  "#7B68EE", // MediumSlateBlue
  "#00FA9A", // MediumSpringGreen
  "#DC143C", // Crimson
  "#F0E68C", // Khaki
];

// Helper functions (pure functions, no hooks)
const extractTrips = (route: SelectedRoute): Trip[] => route.trips;
const extractStops = (trip: Trip): TripStop[] => trip.stops || [];

// --- Schema Definitions for Shape (Copied from your provided schema) ---
export type ShapePoint = {
  lat: number;
  lon: number;
  sequence: number;
};

// --- TanStack Query Hook Definitions ---
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
    queryKey: ["stopLocations", stopIds],
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
    enabled: stopIds.length > 0,
    staleTime: 1000 * 60 * 5,
    cacheTime: 1000 * 60 * 10,
  });
};

/**
 * Hook to fetch shape points by shape ID.
 * @param shapeId The ID of the shape to fetch.
 * @returns A QueryResult containing the shape points.
 */
const fetchShapePoints = async (shapeId: number): Promise<ShapePoint[]> => {
  console.log(`THE SHAPE ID IS: ${shapeId}`);
  const response = await fetch(`/api/v1/shape/${shapeId}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch shape ${shapeId}: ${response.statusText}`);
  }
  return response.json();
};

const useShapePoints = (shapeId: number | null) => {
  return useQuery<ShapePoint[], Error>({
    queryKey: ["shapePoints", shapeId],
    queryFn: () => {
      if (shapeId === null) {
        return Promise.resolve([]); // Return empty array if no shapeId
      }
      return fetchShapePoints(shapeId);
    },
    enabled: shapeId !== null, // Only run query if shapeId is provided and not null
    staleTime: 1000 * 60 * 50, // Cache TTL from your API config (50 minutes)
  });
};

// --- Map Updater Component Definition ---
interface MapUpdaterProps {
  positions: LatLngExpression[];
}

const MapUpdater = ({ positions }: MapUpdaterProps) => {
  const map = useMap();

  useEffect(() => {
    if (positions.length > 0) {
      const bounds = L.latLngBounds(positions);
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [positions, map]);

  return null;
};

// --- Individual Trip Polyline Component Definition ---
interface TripPolylineIndividualProps {
  trip: Trip; // Assuming Trip now includes shapeId: number | null
  color: string;
  stopLocations: StopLocation[]; // Still passed, but now only used for debugging if needed, not line path
}

const TripPolylineIndividual = ({
  trip,
  color,
  stopLocations,
}: TripPolylineIndividualProps) => {
  const shapeId = trip.shape_id ?? null;
  const {
    data: shapePoints,
    isLoading: isLoadingShape,
    isError: isErrorShape,
    error: shapeError,
  } = useShapePoints(shapeId);

  // DEBUG LOG: Track the status of shape data fetching and availability
  useEffect(() => {
    if (shapeId !== null) {
      console.log(
        `[Trip ${trip.id} - Shape ${shapeId}] Loading: ${isLoadingShape}, Error: ${isErrorShape}`,
        "Shape Points:",
        shapePoints,
        "Fetch Error:",
        shapeError
      );
      if (!isLoadingShape && shapePoints && shapePoints.length < 2) {
        console.warn(
          `[Trip ${trip.id} - Shape ${shapeId}] Shape data loaded, but insufficient points (${shapePoints.length}) for polyline.`
        );
      }
    } else {
      console.log(
        `[Trip ${trip.id}] No shapeId detected for this trip. No shape line will be drawn.`
      );
    }
  }, [shapeId, isLoadingShape, isErrorShape, shapePoints, shapeError, trip.id]);

  // Memoize the polyline path. It will ONLY use shape points.
  // If shape points are not available or insufficient, an empty array is returned.
  // This explicitly removes the fallback to stop locations for drawing the line.
  const tripPolyline: LatLngExpression[] = useMemo(() => {
    if (shapeId !== null && shapePoints && shapePoints.length > 1) {
      // Sort shape points by sequence to ensure correct path order
      const sortedShapePoints = [...shapePoints].sort(
        (a, b) => a.sequence - b.sequence
      );
      console.log(
        `[Trip ${trip.id} - Shape ${shapeId}] Using shape data for polyline (${sortedShapePoints.length} points).`
      );
      return sortedShapePoints.map((p) => [p.lat, p.lon]);
    }
    // If no shapeId, or shapePoints not loaded/insufficient, return an empty array.
    // This will prevent the Polyline component from rendering for this trip.
    console.log(
      `[Trip ${trip.id} - Shape ${shapeId}] Polyline will not be drawn (shape data not ready or insufficient).`
    );
    return [];
  }, [shapeId, shapePoints, trip.id]); // Added trip.id to dependencies for clearer logs

  // If shape data is still loading, or if the resulting polyline has fewer than 2 points,
  // then there's no valid line to draw based on the shape.
  // Return null to prevent rendering an incomplete or empty polyline.
  if (isLoadingShape || tripPolyline.length < 2) {
    return null;
  }

  return (
    <Polyline
      key={`trip-polyline-${trip.id}-${shapeId || "no-shape"}`} // Key for React's reconciliation
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
    return null; // Return null if no data to process/render
  }

  return (
    <>
      {trips.map(({ trip, color }) => (
        <TripPolylineIndividual
          key={`trip-individual-${trip.id}`} // Stable key for each individual trip component
          trip={trip}
          color={color}
          stopLocations={stopLocations} // Pass stopLocations (not used for lines, but keep for type safety/future)
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
    return null;
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
  // ALL HOOKS MUST BE CALLED UNCONDITIONALLY AT THE TOP LEVEL OF THE COMPONENT.
  // This ensures a consistent number and order of hook calls on every render,
  // preventing the "Rendered more hooks" error.

  const { selectedRoutes } = useSelectedRoutesStore();

  // Prepare allStopIds (always called)
  const allStopIds = useMemo(() => {
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

  // Fetch stop locations (always called)
  const {
    data: stopLocations,
    isLoading,
    isError,
    error,
  } = useStopLocations(allStopIds);

  // Prepare trips with colors and ensure `shapeId` is present (always called)
  const tripsToRender = useMemo(() => {
    const tripsWithColors: { trip: Trip; color: string }[] = [];
    let colorIndex = 0;

    selectedRoutes.forEach((route) => {
      extractTrips(route).forEach((trip) => {
        const color = ROUTE_COLORS[colorIndex % ROUTE_COLORS.length];

        // --- IMPORTANT: TEMPORARY MOCKING FOR DEBUGGING ---
        // You MUST ensure your 'Trip' objects (fetched from your backend)
        // actually contain the 'shapeId' property.
        // If not, you need to modify your DB schema and backend API to include it.
        // This mocking is to help determine if the problem is 'shapeId' absence
        // or a problem with the shape API call.
        const tripWithMockedShapeId: Trip = {
          ...trip,
          // Assign a known existing shape ID from your database for testing.
          // Example: If your DB has shape ID 101 or 102, use one of those.
          shapeId: 101, // <-- REPLACE THIS WITH YOUR ACTUAL SHAPE ID FIELD LATER
        };
        tripsWithColors.push({ trip: tripWithMockedShapeId, color });
        // --- END TEMPORARY MOCKING ---

        colorIndex++;
      });
    });
    return tripsWithColors;
  }, [selectedRoutes]);

  // Calculate all map positions (always called)
  const allMapPositions: LatLngExpression[] = useMemo(() => {
    if (!stopLocations) return [];
    const positions: LatLngExpression[] = [];
    tripsToRender.forEach(({ trip }) => {
      // For map bounding, we'll use stop locations.
      // To precisely fit bounds to shapes, you would need to have all shape points
      // aggregated at this level, which means fetching all shapes here or accumulating them.
      // For simplicity and to avoid over-complicating this specific MapCanvas,
      // we'll stick to stop locations for bounds calculation, as it's generally a good proxy.
      extractStops(trip).forEach((tripStop) => {
        const stopDetail = stopLocations.find((sl) => sl.id === tripStop.id);
        if (stopDetail) {
          positions.push([stopDetail.lat, stopDetail.lon]);
        }
      });
    });
    return positions;
  }, [tripsToRender, stopLocations]);

  // --- Conditional UI RENDERING (after all hooks are safely called) ---

  // Display a message if no routes are selected
  if (selectedRoutes.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-24 h-24 mx-auto bg-muted rounded-full flex items-center justify-center">
            <MapPin className="w-12 h-12 text-muted-foreground" />
          </div>
          <div className="space-y-2">
            <h3 className="text-lg font-semibold">Select Routes to View</h3>
            <p className="text-muted-foreground">
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
      <div className="flex-1 flex items-center justify-center">
        <p className="text-muted-foreground">Loading map data...</p>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-red-500">Error loading map data: {error?.message}</p>
      </div>
    );
  }

  // --- Render the Leaflet map with all components ---
  return (
    <MapContainer
      center={allMapPositions.length > 0 ? allMapPositions[0] : [51.505, -0.09]}
      zoom={13}
      scrollWheelZoom={true}
      style={{ height: "100%", width: "100%", flexGrow: 1 }}
      className="z-0"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      {/* UniqueStopMarkerRenderer will display markers ONLY at stop locations */}
      <UniqueStopMarkerRenderer stopLocations={stopLocations || []} />

      {/* AllTripsPolylineLayer will now ONLY draw lines using shape data if available */}
      <AllTripsPolylineLayer
        trips={tripsToRender}
        stopLocations={stopLocations || []} // stopLocations passed, but not used for drawing lines in TripPolylineIndividual
      />

      <MapUpdater positions={allMapPositions} />
    </MapContainer>
  );
};

export default MapCanvas;
