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
      const data = await response.json();
      if (Array.isArray(data)) {
        return data;
      } else {
        console.warn(`API response for ${type} is not an array:`, data);
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
