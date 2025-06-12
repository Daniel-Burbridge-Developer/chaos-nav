import { useQuery } from '@tanstack/react-query';
import { tripsByRouteQuery } from '@/lib/queries/trips';

export const useTripsByRoute = (routeId: string) => {
  return useQuery(tripsByRouteQuery(routeId));
};
