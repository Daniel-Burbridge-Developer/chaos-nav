// src/hooks/use-live-trips.ts (or wherever your use-live-trips.ts file is)

import { useQuery } from '@tanstack/react-query';

interface TripData {
  liveStatus: boolean;
  busNumber: string;
  timeUntilArrival: string;
  destination: string;
  tripId: string;
  fleetId: string | null;
}

const getLiveTripsByFirstStopId = async (query: string) => {
  if (!query.trim()) {
    return [];
  }

  try {
    const liveTripsResponse = await fetch(`api/v1/livestop/${query}`);

    const parseResponse = async (response: Response, type: string) => {
      if (!response.ok) {
        throw new Error(
          `Failed to fetch ${type}: ${response.status} ${response.statusText}`
        );
      }
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error(`Received non-JSON response from ${type} API.`);
      }
      const rawData = await response.json(); // Get the raw JSON data

      // --- CRITICAL CHANGE HERE ---
      // Check if the data is an object with a 'data' property that is an array
      if (
        typeof rawData === 'object' &&
        rawData !== null &&
        Array.isArray(rawData.data)
      ) {
        return rawData.data; // Return the array contained within the 'data' property
      } else if (Array.isArray(rawData)) {
        // Fallback for direct array response (less likely now)
        console.warn(
          `API response for ${type} is a direct array (unexpected for this error):`,
          rawData
        );
        return rawData;
      } else {
        // This is the line that was causing your warning, now it's only hit if it's truly not an array AND not an object with a 'data' array
        console.warn(
          `API response for ${type} is not an array or does not contain a 'data' array:`,
          rawData
        );
        return [];
      }
    };

    const liveTrips = (await parseResponse(
      liveTripsResponse,
      'live-trips'
    )) as TripData[];

    return liveTrips;
  } catch (error) {
    console.error('Error fetching search results:', error);
    return [];
  }
};

export const useLiveTrips = (query: string) => {
  return useQuery({
    queryKey: ['liveTrips', query],
    queryFn: () => getLiveTripsByFirstStopId(query),
    enabled: !!query.trim(),
    staleTime: 1000 * 60 * 0.5, // 30 seconds
    refetchInterval: 1000 * 60 * 0.5, // Actively refetch every 30 seconds
    refetchIntervalInBackground: true,
    refetchOnWindowFocus: true,
  });
};
