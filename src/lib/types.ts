export interface BusTimeItem {
  liveStatus: boolean;
  busNumber: string;
  timeUntilArrival: string;
  destination: string;
}

export interface StopSuggestion {
  id: number;
  name: string;
  number: string;
}
