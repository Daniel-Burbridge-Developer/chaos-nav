import type { BusTimeItem, StopSuggestion } from '~/lib/types';

export async function fetchStopData(
  stopNumber: string
): Promise<BusTimeItem[]> {
  try {
    const response = await fetch(`/api/busstop-id/${stopNumber}`);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to fetch');
    }

    return data.data;
  } catch (error: any) {
    console.warn(`Error fetching stop ${stopNumber}`, error);
    throw new Error(error?.message || 'Failed to fetch stop data');
  }
}

export async function fetchStopSuggestions(
  query: string
): Promise<StopSuggestion[]> {
  if (!query || query.length < 3) {
    return [];
  }

  try {
    const response = await fetch(`/api/busstop-infoFts5/${query}`);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to fetch stop suggestions');
    }

    return data.data;
  } catch (error) {
    console.error('Error fetching stop suggestions from API route:', error);
    return [];
  }
}
