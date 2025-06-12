import { useQuery } from '@tanstack/react-query';
import { tripByIdQuery } from '@/lib/queries/trips';

export const useTripById = (tripId: string) => {
  return useQuery(tripByIdQuery(tripId));
};
