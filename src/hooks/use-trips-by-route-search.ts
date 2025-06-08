import { useQuery } from '@tanstack/react-query';

import type { Trip } from '~/db/schema/trips';

const fetchTripsByRoute = async (query: string) => {
  if (!query.trim()) {
    return [];
  }

  try {
    const tripsResponse = await fetch(
      `/api/v1/trips-by-route/${encodeURIComponent(query)}`
    );

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

    const trips = (await parseResponse(tripsResponse, 'trips')) as Trip[];

    return trips;
  } catch (error) {
    console.error('Error fetching search results:', error);
    return [];
  }
};

export const useTripsByRoute = (query: string) => {
  return useQuery({
    queryKey: ['tripsByRoute', query],
    queryFn: () => fetchTripsByRoute(query),
    enabled: !!query.trim(),
    staleTime: 1000 * 60 * 500, // 500 minutes
  });
};
