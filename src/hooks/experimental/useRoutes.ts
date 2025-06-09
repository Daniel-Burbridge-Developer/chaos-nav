// src/hooks/useRoutes.ts

import { useQuery } from '@tanstack/react-query';
import { fetchAllRoutes } from '~/utils/experimental/routes'; // <--- Changed import to FullRoute
import { Route } from '~/db/schema/routes';

/**
 * React Query hook to fetch all routes, returning the full Route object.
 *
 * @returns A `UseQueryResult` object containing:
 * - `data`: An array of `FullRoute` objects (or `undefined` if loading/error).
 * - `isLoading`: `true` when fetching data.
 * - `isError`: `true` if an error occurred during fetching.
 * - `error`: The error object if `isError` is true.
 * - `isFetching`: `true` if data is being fetched (includes background refetches).
 */
export function useAllRoutesQuery() {
  return useQuery<Route[], Error>({
    // <--- Changed type to FullRoute[]
    queryKey: ['allRoutes'],
    queryFn: fetchAllRoutes,
    staleTime: 1000 * 60 * 500, // 500 minutes (matching your example)
    gcTime: 1000 * 60 * 60,
  });
}
