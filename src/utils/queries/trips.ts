import { apiFetch } from '@/lib/apiClient';
import { Trip } from '~/db/schema';

export const tripByIdQuery = (tripId: string) => ({
  queryKey: ['trip', tripId],
  queryFn: (): Promise<Trip> => apiFetch(`/api/v1/trip.${tripId}`),
});

export const tripsByRouteQuery = (routeId: string) => ({
  queryKey: ['trips', routeId],
  queryFn: (): Promise<Trip[]> => apiFetch(`/api/v1/trips-by-route.${routeId}`),
});
