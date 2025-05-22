import { createFileRoute } from '@tanstack/react-router';
import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';

export const Route = createFileRoute('/')({
  component: Home,
});

const fetchStopData = async (stopNumber: string) => {
  const response = await fetch(`/api/busstop-id/${stopNumber}`);

  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Failed to fetch');
  return data.data;
};

function Home() {
  const [inputValue, setInputValue] = useState('');
  const [stops, setStops] = useState<string[]>([]);

  const addStop = () => {
    const trimmed = inputValue.trim();
    if (trimmed && !stops.includes(trimmed)) {
      setStops([...stops, trimmed]);
      setInputValue('');
    }
  };

  const removeStop = (stop: string) => {
    setStops(stops.filter((s) => s !== stop));
  };

  return (
    <div className='min-h-screen bg-zinc-900 text-zinc-100 flex flex-col items-center justify-start p-6 font-sans'>
      <div className='bg-zinc-800 p-6 rounded-2xl shadow-2xl w-full max-w-3xl border border-zinc-700 mb-6'>
        <h1 className='text-4xl font-extrabold text-white mb-4 tracking-tight text-center'>
          🚍 Transperth Multi-Stop Live Viewer
        </h1>

        <div className='flex flex-col sm:flex-row items-center gap-4 mb-4'>
          <input
            type='text'
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder='Enter Stop Number (e.g. 12725)'
            className='w-full sm:flex-1 p-3 rounded-lg bg-zinc-700 text-white border border-zinc-600 focus:outline-none focus:ring-2 focus:ring-blue-500'
          />
          <button
            onClick={addStop}
            className='bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg transition'
          >
            Add Stop
          </button>
        </div>

        {stops.length > 0 && (
          <p className='text-zinc-400 text-sm text-center'>
            Showing live data for {stops.length} stop
            {stops.length > 1 ? 's' : ''}
          </p>
        )}
      </div>

      <div className='w-full max-w-3xl flex flex-col gap-8'>
        {stops.map((stopNumber) => (
          <StopCard
            key={stopNumber}
            stopNumber={stopNumber}
            onRemove={removeStop}
          />
        ))}
      </div>
    </div>
  );
}

// Individual Stop Section
function StopCard({
  stopNumber,
  onRemove,
}: {
  stopNumber: string;
  onRemove: (stop: string) => void;
}) {
  const { data, error, isFetching } = useQuery({
    queryKey: ['stopData', stopNumber],
    queryFn: () => fetchStopData(stopNumber),
    enabled: !!stopNumber,
    refetchInterval: 20000,
    retry: false,
  });

  return (
    <div className='bg-zinc-800 rounded-2xl p-6 border border-zinc-700 shadow-lg relative'>
      <div className='flex justify-between items-center mb-4'>
        <h2 className='text-2xl font-bold text-white'>🅿️ Stop {stopNumber}</h2>
        <button
          onClick={() => onRemove(stopNumber)}
          className='text-red-400 hover:text-red-300 text-sm'
        >
          ✖ Remove
        </button>
      </div>

      {isFetching && (
        <p className='text-blue-400 text-sm mb-3 animate-pulse'>
          Refreshing data...
        </p>
      )}

      {error && (
        <p className='bg-red-500/10 border border-red-500 text-red-300 p-3 rounded text-sm'>
          ⚠️ {(error as Error).message}
        </p>
      )}

      {Array.isArray(data) && data.length > 0 && (
        <div className='grid gap-3'>
          {data.map((item, index) => {
            const pulse =
              item.timeUntilArrival.trim().toLowerCase() === '0 min' ||
              item.timeUntilArrival.toLowerCase().includes('now');

            return (
              <div
                key={index}
                className={`rounded-xl p-4 border border-zinc-600 bg-zinc-700/60 shadow transition duration-300 ${
                  pulse ? 'animate-pulse border-green-400' : 'hover:shadow-md'
                }`}
              >
                <div className='flex items-center justify-between'>
                  <div className='flex items-center gap-4'>
                    <div className='text-white text-2xl font-bold'>
                      🚌 {item.busNumber}
                    </div>
                    {item.liveStatus && (
                      <span className='bg-green-600 text-white text-xs font-bold px-2 py-1 rounded-full'>
                        LIVE
                      </span>
                    )}
                  </div>
                  <div className='text-right'>
                    <div className='text-xl font-bold text-blue-400'>
                      {item.timeUntilArrival}
                    </div>
                  </div>
                </div>
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
