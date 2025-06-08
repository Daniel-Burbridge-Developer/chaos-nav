// src/hooks/use-transport-search.ts
import { useQuery } from '@tanstack/react-query';
import type { Route } from '~/db/schema/routes';
import type { Stop } from '~/db/schema/stops';

// Unified fetch function for both routes and stops
const fetchSearchResults = async (query: string) => {
  if (!query.trim()) {
    return { routes: [], stops: [] };
  }

  try {
    const [routesResponse, stopsResponse] = await Promise.all([
      fetch(`/api/v1/routes/${encodeURIComponent(query)}`),
      fetch(`/api/v1/stops/${encodeURIComponent(query)}`),
    ]);

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

    const routes = (await parseResponse(routesResponse, 'routes')) as Route[];
    const stops = (await parseResponse(stopsResponse, 'stops')) as Stop[];

    return { routes, stops };
  } catch (error) {
    console.error('Error fetching search results:', error);
    return { routes: [], stops: [] };
  }
};

export const useTransportSearch = (queryTerm: string, mounted: boolean) => {
  return useQuery({
    queryKey: ['transportSearch', queryTerm],
    queryFn: () => fetchSearchResults(queryTerm),
    enabled: !!queryTerm.trim() && mounted,
    staleTime: 1000 * 60 * 500, // 500 minutes
  });
};
