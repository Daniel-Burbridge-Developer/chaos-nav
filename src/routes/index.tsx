// src/routes/__root.tsx or wherever your Home component is located
import { createFileRoute } from '@tanstack/react-router';
import React, { useState, useEffect, useRef } from 'react';
import { useQuery, QueryClient, useQueryClient } from '@tanstack/react-query';
import { queryObjects } from 'v8';
// Removed createServerFn as it's no longer used for fetchStopSuggestions in this file
// Removed db and drizzle-orm imports as they are no longer needed in this file

interface BusTimeItem {
  liveStatus: boolean;
  busNumber: string;
  timeUntilArrival: string;
  destination: string;
}

interface StopSuggestion {
  id: number;
  name: string;
  number: string;
}

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
}

export const Route = createFileRoute('/')({ component: Home });

const fetchStopData = async (stopNumber: string): Promise<BusTimeItem[]> => {
  try {
    const response = await fetch(`/api/busstop-id/${stopNumber}`);
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Failed to fetch');
    return data.data;
  } catch (error: any) {
    console.warn(`Error fetching stop ${stopNumber}`, error);
    throw new Error(error?.message || 'Failed to fetch stop data');
  }
};

// Now fetches from the new API route
const fetchStopSuggestions = async (
  query: string
): Promise<StopSuggestion[]> => {
  if (!query || query.length < 3) {
    // Return an empty array or handle as needed when query is too short
    return [];
  }
  try {
    // The API route will handle the DB querying
    const response = await fetch(`/api/busstop-infoFts5/${query}`); // Note the changed path
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || 'Failed to fetch stop suggestions');
    }
    return data.data;
  } catch (error) {
    console.error('Error fetching stop suggestions from API route:', error);
    return []; // Return empty array on error
  }
};

function Home() {
  const [inputValue, setInputValue] = useState('');
  const [stops, setStops] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const debouncedInput = useDebounce(inputValue, 300);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  // Check if this queryKey has cached data
  const queryClient = useQueryClient();
  const hasCachedSuggestions = !!queryClient.getQueryData<StopSuggestion[]>([
    'stopSuggestions',
    debouncedInput,
  ]);
  const {
    data: suggestions = [],
    isFetching,
    error,
  } = useQuery<StopSuggestion[], Error>({
    queryKey: ['stopSuggestions', debouncedInput],
    queryFn: () => fetchStopSuggestions(debouncedInput),
    enabled: debouncedInput.length >= 3 && !hasCachedSuggestions,
    staleTime: Infinity,
    retry: false,
  });

  const addStop = () => {
    const trimmed = inputValue.trim();
    if (trimmed && !stops.includes(trimmed)) {
      setStops([...stops, trimmed]);
      setInputValue('');
      setShowSuggestions(false);
    }
  };

  const handleSelect = (s: StopSuggestion) => {
    setInputValue(s.number);
    setShowSuggestions(false);
    inputRef.current?.focus();
  };

  const handleBlur = () =>
    setTimeout(() => {
      if (!suggestionsRef.current?.contains(document.activeElement))
        setShowSuggestions(false);
    }, 100);

  return (
    <div className='min-h-screen bg-zinc-900 text-zinc-100 p-6 flex flex-col items-center'>
      <div className='bg-zinc-800 p-6 rounded-2xl shadow-2xl w-full max-w-3xl border border-zinc-700 mb-6'>
        <h1 className='text-4xl font-extrabold text-white mb-4 text-center'>
          🚍 Transperth Multi-Stop Live Viewer
        </h1>

        <div className='relative flex flex-col sm:flex-row items-center gap-4 mb-4'>
          <input
            ref={inputRef}
            type='text'
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onFocus={() => setShowSuggestions(true)}
            onBlur={handleBlur}
            placeholder='Enter Stop Number or Name'
            className='w-full p-3 rounded-lg bg-zinc-700 border border-zinc-600 text-white focus:ring-2 focus:ring-blue-500'
          />
          <button
            onClick={addStop}
            className='bg-blue-600 hover:bg-blue-700 text-white py-3 px-6 rounded-lg font-bold'
          >
            Add Stop
          </button>

          {showSuggestions && suggestions.length > 0 && (
            <div
              ref={suggestionsRef}
              className='absolute z-10 w-full top-full mt-2 bg-zinc-700 border border-zinc-600 rounded-lg shadow-lg max-h-60 overflow-y-auto'
            >
              {suggestions.map((s) => (
                <div
                  key={s.id}
                  onClick={() => handleSelect(s)}
                  className='p-3 hover:bg-zinc-600 cursor-pointer border-b border-zinc-600'
                >
                  <p className='text-white font-semibold'>{s.name}</p>
                  <p className='text-zinc-400 text-sm'>
                    Stop Number: {s.number}
                  </p>
                </div>
              ))}
            </div>
          )}

          {isFetching && (
            <p className='absolute mt-2 text-sm text-zinc-400'></p>
          )}
          {error && (
            <p className='absolute mt-2 p-3 text-sm bg-red-500/10 text-red-300 border border-red-500 rounded'>
              Error: {error.message}
            </p>
          )}
        </div>

        {stops.length > 0 && (
          <p className='text-center text-zinc-400 text-sm'>
            Showing live data for {stops.length} stop
            {stops.length > 1 ? 's' : ''}.
          </p>
        )}
      </div>

      <div className='w-full max-w-3xl flex flex-col gap-8'>
        {stops.map((stop) => (
          <StopCard
            key={stop}
            stopNumber={stop}
            onRemove={(s) => setStops(stops.filter((x) => x !== s))}
          />
        ))}
      </div>
    </div>
  );
}

function StopCard({
  stopNumber,
  onRemove,
}: {
  stopNumber: string;
  onRemove: (s: string) => void;
}) {
  const { data, error, isFetching } = useQuery<BusTimeItem[], Error>({
    queryKey: ['stopData', stopNumber],
    queryFn: () => fetchStopData(stopNumber),
    enabled: !!stopNumber,
    refetchInterval: 20000,
    retry: false,
  });

  return (
    <div className='bg-zinc-800 p-6 rounded-2xl border border-zinc-700 shadow-lg'>
      <div className='flex justify-between items-center mb-4'>
        <h2 className='text-2xl font-bold text-white'>
          Stop {stopNumber}
          {isFetching && (
            <span className='animate-spin ml-2 text-blue-400'>🔄</span>
          )}
        </h2>
        <button
          onClick={() => onRemove(stopNumber)}
          className='text-red-400 hover:text-red-300 text-sm'
        >
          ✖ Remove
        </button>
      </div>

      {error && (
        <p className='bg-red-500/10 border border-red-500 text-red-300 p-3 rounded text-sm'>
          ⚠️ {error.message}
        </p>
      )}

      {Array.isArray(data) && data.length > 0 && (
        <div className='grid gap-3'>
          {data.map((item, idx) => {
            const isSoon = ['0 min', 'now'].includes(
              item.timeUntilArrival.toLowerCase().trim()
            );
            return (
              <div
                key={idx}
                className={`rounded-xl p-4 border ${
                  isSoon ? 'animate-pulse border-green-400' : 'border-zinc-600'
                } bg-zinc-700/60 shadow`}
              >
                <div className='flex justify-between items-center'>
                  <div className='flex items-center gap-4'>
                    <span className='text-2xl font-bold text-white'>
                      🚌 {item.busNumber}
                    </span>
                    {item.liveStatus && (
                      <span className='bg-green-600 text-white text-xs font-bold px-2 py-1 rounded-full'>
                        LIVE
                      </span>
                    )}
                  </div>
                  <div className='text-xl font-bold text-blue-400'>
                    {item.timeUntilArrival}
                  </div>
                </div>
                {item.destination && (
                  <p className='text-sm text-zinc-300 mt-1'>
                    {item.destination}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}

      {Array.isArray(data) && data.length === 0 && (
        <p className='text-zinc-400'>No upcoming buses found for this stop.</p>
      )}
    </div>
  );
}
