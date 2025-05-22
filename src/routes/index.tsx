// src/routes/__root.tsx or wherever your Home component is located
import { createFileRoute } from '@tanstack/react-router';
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query'; // Import useQueryClient

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

const fetchStopSuggestions = async (
  query: string
): Promise<StopSuggestion[]> => {
  // Prevent API call if query is too short (client-side check)
  if (!query || query.length < 3) {
    // Increased minimum length to 3 for suggestions to match backend
    return [];
  }
  try {
    const response = await fetch(`/api/busstop-info/${query}`);
    const data = await response.json();
    if (!response.ok) {
      // Log the full error response from the API for better debugging
      console.error('API Error fetching stop suggestions:', data);
      throw new Error(data.error || 'Failed to fetch stop suggestions');
    }
    return data.data;
  } catch (error) {
    console.error('Error fetching stop suggestions from API route:', error);
    return [];
  }
};

function Home() {
  const [inputValue, setInputValue] = useState('');
  const [stops, setStops] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const debouncedInput = useDebounce(inputValue, 300);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  const queryClient = useQueryClient(); // Initialize queryClient

  // Ensure suggestions are only fetched when debouncedInput meets the length criteria
  const {
    data: suggestions = [],
    isFetching,
    error,
  } = useQuery<StopSuggestion[], Error>({
    queryKey: ['stopSuggestions', debouncedInput],
    queryFn: () => fetchStopSuggestions(debouncedInput),
    enabled:
      debouncedInput.length >= 3 &&
      !queryClient.getQueryData(['stopSuggestions', debouncedInput]),
    staleTime: Infinity,
  });

  const addStop = () => {
    const trimmed = inputValue.trim();
    // Before adding, try to find an exact match in current suggestions
    const exactMatch = suggestions.find(
      (s) =>
        s.number === trimmed || s.name.toLowerCase() === trimmed.toLowerCase()
    );

    if (exactMatch && !stops.includes(exactMatch.number)) {
      setStops([...stops, exactMatch.number]);
      setInputValue('');
      setShowSuggestions(false);
    } else if (trimmed && !stops.includes(trimmed)) {
      // If no exact match among suggestions, add the input value directly
      // This allows users to add a stop number even if it wasn't in suggestions
      setStops([...stops, trimmed]);
      setInputValue('');
      setShowSuggestions(false);
    }
  };

  const handleSelect = (s: StopSuggestion) => {
    setInputValue(s.number);
    setShowSuggestions(false);
    inputRef.current?.focus();
    // Immediately invalidate the suggestion cache for this specific query
    // if you want to force a refetch next time this exact input is typed.
    // However, for this use case, keeping it stale is probably fine.
    // queryClient.invalidateQueries({ queryKey: ['stopSuggestions', s.number] });
  };

  const handleBlur = () =>
    setTimeout(() => {
      // Only hide suggestions if the focus is not moving to a suggestion item
      if (!suggestionsRef.current?.contains(document.activeElement))
        setShowSuggestions(false);
    }, 100);

  // Use useMemo for the display suggestions to avoid re-calculating on every render
  // unless inputValue or suggestions change.
  const displaySuggestions = useMemo(() => {
    if (!inputValue || inputValue.length < 3) return []; // Only show suggestions for longer inputs
    // Optionally, you can add client-side filtering here if you want to fine-tune
    // what's displayed based on the raw inputValue even before debouncing.
    // For now, we rely on the debounced input for the API call.
    return suggestions;
  }, [inputValue, suggestions]);

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

          {showSuggestions &&
            Array.isArray(displaySuggestions) &&
            displaySuggestions.length > 0 && ( // Ensure array before checking length
              <div
                ref={suggestionsRef}
                className='absolute z-10 w-full top-full mt-2 bg-zinc-700 border border-zinc-600 rounded-lg shadow-lg max-h-60 overflow-y-auto'
              >
                {displaySuggestions.map(
                  (
                    s: StopSuggestion // Explicitly type s
                  ) => (
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
                  )
                )}
              </div>
            )}

          {isFetching &&
            debouncedInput.length >= 3 && ( // Only show loading when actively fetching for relevant input
              <p className='absolute mt-2 text-sm text-zinc-400'>
                Loading suggestions...
              </p>
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
                className={`rounded-xl p-4 border ${isSoon ? 'animate-pulse border-green-400' : 'border-zinc-600'} bg-zinc-700/60 shadow`}
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
