import React, { useState, useEffect } from "react";
import {
  MapContainer,
  TileLayer,
  useMap,
  Marker,
  Popup,
  Polyline,
} from "react-leaflet";
import { LatLngExpression } from "leaflet";
import { useQuery } from "@tanstack/react-query";
import "leaflet/dist/leaflet.css";

type Stop = { id: string; name: string; lat: number; lon: number };

type InteractiveMapProps = {
  zoom?: number;
};

function MapViewUpdater({ center }: { center: LatLngExpression }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, map.getZoom());
  }, [center, map]);
  return null;
}

const fetchStops = async (): Promise<Stop[]> => {
  // currently hardcoded to fetch stops for bus route 85
  // You can modify this to accept a bus route number as a parameter if needed (it will be)
  const response = await fetch("/api/bus-route/85");
  if (!response.ok) throw new Error("Failed to fetch stops");
  const json = await response.json();

  const stops: Stop[] = [];

  // Assuming json.stops is an array of objects with an 'id' property
  for (const stop of json.stops) {
    const newRes = await fetch(`/api/busstop-location-data/${stop.id}`);
    if (!newRes.ok) throw new Error("Failed to fetch stop details");
    const stopDetails = await newRes.json();
    stops.push({
      id: stop.id,
      name: stopDetails.name,
      lat: stopDetails.lat,
      lon: stopDetails.lon,
    });
  }

  console.log("Fetched stops LOOK RIGHT HERE:", stops);
  return stops;
};

export function InteractiveMap({ zoom = 13 }: InteractiveMapProps) {
  const DEFAULT_CENTER: LatLngExpression = [-31.9505, 115.8605];
  const [currentCenter, setCurrentCenter] =
    useState<LatLngExpression>(DEFAULT_CENTER);
  const [geoLocationLoaded, setGeoLocationLoaded] = useState(false); // New state to track geolocation loading
  const [error, setError] = useState<string | null>(null);

  // Geolocation effect
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setCurrentCenter([
            position.coords.latitude,
            position.coords.longitude,
          ]);
          setGeoLocationLoaded(true); // Set true when geolocation is resolved
        },
        (err) => {
          setError(err.message || "Failed to get your location.");
          setCurrentCenter(DEFAULT_CENTER);
          setGeoLocationLoaded(true); // Set true even if geolocation fails
        },
        { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
      );
    } else {
      setError("Geolocation is not supported by your browser.");
      setCurrentCenter(DEFAULT_CENTER);
      setGeoLocationLoaded(true); // Set true if geolocation is not supported
    }
  }, []);

  // TanStack Query for stops
  const {
    data: stops,
    isLoading: stopsLoading,
    error: stopsError,
  } = useQuery({
    queryKey: ["bus-route-85-stops"],
    queryFn: fetchStops,
    staleTime: 1000 * 60 * 5, // 5 minutes
    enabled: geoLocationLoaded, // Only enable the query after geolocation has loaded
  });

  if (!geoLocationLoaded) {
    return (
      <div className="h-[500px] w-full flex items-center justify-center bg-gray-100 rounded-lg shadow">
        <p className="text-gray-600">Finding your location...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-[500px] w-full flex items-center justify-center bg-red-100 rounded-lg shadow">
        <p className="text-red-600">
          {error || "Failed to load map or stops."}
        </p>
      </div>
    );
  }

  if (stopsLoading) {
    return (
      <div className="h-[500px] w-full flex items-center justify-center bg-gray-100 rounded-lg shadow">
        <p className="text-gray-600">Loading bus stops...</p>
      </div>
    );
  }

  if (stopsError) {
    return (
      <div className="h-[500px] w-full flex items-center justify-center bg-red-100 rounded-lg shadow">
        <p className="text-red-600">
          {stopsError?.message || "Failed to load bus stops."}
        </p>
      </div>
    );
  }

  return (
    <MapContainer
      center={currentCenter}
      zoom={zoom}
      scrollWheelZoom={true}
      className="h-[500px] w-full rounded-lg shadow"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <MapViewUpdater center={currentCenter} />
      {stops && stops.length > 1 && (
        <Polyline
          positions={stops.map(
            (stop) => [stop.lat, stop.lon] as [number, number]
          )}
          color="blue"
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
              <div className="text-center">
                <h3 className="font-semibold">{stop.name}</h3>
                <p className="text-sm text-gray-500">Stop ID: {stop.id}</p>
              </div>
            </Popup>
          </Marker>
        ))}
    </MapContainer>
  );
}
