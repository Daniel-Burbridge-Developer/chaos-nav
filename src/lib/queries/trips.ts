import { apiFetch } from '@/lib/apiClient';
import { Trip } from '~/schemas/index';

export const tripByIdQuery = (tripId: string) => ({
  queryKey: ['trip', tripId],
  queryFn: (): Promise<Trip> => apiFetch(`/api/v1/trip.${tripId}`),
  staleTime: 1000 * 60 * 60 * 10, // 10 Hours
});

export const tripsByRouteQuery = (routeId: string) => ({
  queryKey: ['trips', routeId],
  queryFn: (): Promise<Trip[]> => apiFetch(`/api/v1/trips-by-route.${routeId}`),
  staleTime: 1000 * 60 * 60 * 10, // 10 Hours
});
