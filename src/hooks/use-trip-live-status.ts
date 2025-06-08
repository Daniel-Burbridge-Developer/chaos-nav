// src/hooks/use-trip-live-status.ts
import { useMemo } from 'react';
import { LiveStopResult } from '~/routes/api/v1/livestop.$stopNumber'; // Assuming you have this interface available
import { Trip } from '~/db/schema/trips'; // Assuming your Trip type is defined here

interface UseTripLiveStatusOptions {
  liveData: LiveStopResult[] | undefined;
  liveBusNumber: string;
  tripHeadsign: string | null | undefined;
}

interface UseTripLiveStatusResult {
  isLive: boolean;
  relevantLiveData: LiveStopResult[];
}

/**
 * Custom hook to determine if a specific trip has relevant live status updates.
 * Matches live data based on bus number and destination/trip headsign.
 *
 * @param options.liveData - The array of live stop results fetched from the API.
 * @param options.liveBusNumber - The bus number to match against (from the specific trip).
 * @param options.tripHeadsign - The trip headsign/destination to match against.
 * @returns An object containing `isLive` (boolean) and `relevantLiveData` (filtered array).
 */
export const useTripLiveStatus = ({
  liveData,
  liveBusNumber,
  tripHeadsign,
}: UseTripLiveStatusOptions): UseTripLiveStatusResult => {
  const relevantLiveData = useMemo(() => {
    // If no live data is received, or if essential matching criteria are missing, return an empty array
    if (!liveData || !liveBusNumber || !tripHeadsign) {
      return [];
    }

    const normalizedLiveBusNumber = liveBusNumber.trim().toLowerCase();
    const normalizedTripHeadsign = tripHeadsign.trim().toLowerCase();

    const filtered = liveData.filter((data) => {
      const normalizedBusNumber = data.busNumber.trim().toLowerCase();
      const normalizedDestination = data.destination.trim().toLowerCase();

      const busNumberMatch = normalizedBusNumber === normalizedLiveBusNumber;
      const destinationMatch = normalizedDestination === normalizedTripHeadsign;

      return busNumberMatch && destinationMatch;
    });

    return filtered;
  }, [liveData, liveBusNumber, tripHeadsign]); // Dependencies for useMemo

  const isLive = relevantLiveData.length > 0;

  return { isLive, relevantLiveData };
};
