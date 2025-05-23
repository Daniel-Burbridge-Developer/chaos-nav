import { useQuery } from '@tanstack/react-query';
import { fetchStopData } from '~/lib/api';
import type { BusTimeItem } from '~/lib/types';
import { X, RefreshCw, Bus } from 'lucide-react';
import { motion } from 'framer-motion';

interface StopCardProps {
  stopNumber: string;
  onRemove: (stopNumber: string) => void;
}

export function StopCard({ stopNumber, onRemove }: StopCardProps) {
  const { data, error, isFetching, refetch } = useQuery<BusTimeItem[], Error>({
    queryKey: ['stopData', stopNumber],
    queryFn: () => fetchStopData(stopNumber),
    enabled: !!stopNumber,
    refetchInterval: 20000,
    retry: false,
  });

  return (
    <div className='bg-zinc-800 p-6 rounded-2xl border border-zinc-700 shadow-lg'>
      <div className='flex justify-between items-center mb-4'>
        <div className='flex items-center gap-2'>
          <h2 className='text-2xl font-bold text-white'>Stop {stopNumber}</h2>
          {isFetching ? (
            <RefreshCw className='h-5 w-5 text-blue-400 animate-spin' />
          ) : (
            <button
              onClick={() => refetch()}
              className='text-zinc-400 hover:text-blue-400 transition-colors'
              title='Refresh'
            >
              <RefreshCw className='h-5 w-5' />
            </button>
          )}
        </div>
        <button
          onClick={() => onRemove(stopNumber)}
          className='text-zinc-400 hover:text-red-400 transition-colors p-1 rounded-full hover:bg-zinc-700'
          title='Remove stop'
        >
          <X className='h-5 w-5' />
        </button>
      </div>

      {error && (
        <div className='bg-red-500/10 border border-red-500 text-red-300 p-3 rounded text-sm mb-4'>
          ⚠️ {error.message}
        </div>
      )}

      {Array.isArray(data) && data.length > 0 ? (
        <div className='grid gap-3'>
          {data.map((item, idx) => (
            <BusItem key={idx} bus={item} />
          ))}
        </div>
      ) : Array.isArray(data) && data.length === 0 ? (
        <p className='text-zinc-400 py-4 text-center'>
          No upcoming buses found for this stop.
        </p>
      ) : (
        !error && (
          <div className='py-4 flex justify-center'>
            <RefreshCw className='h-8 w-8 text-blue-400 animate-spin' />
          </div>
        )
      )}
    </div>
  );
}

function BusItem({ bus }: { bus: BusTimeItem }) {
  const isSoon = ['0 min', 'now'].includes(
    bus.timeUntilArrival.toLowerCase().trim()
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className={`rounded-xl p-4 border ${
        isSoon ? 'border-green-400' : 'border-zinc-600'
      } bg-zinc-700/60 shadow-md ${isSoon ? 'animate-pulse' : ''}`}
    >
      <div className='flex justify-between items-center'>
        <div className='flex items-center gap-3'>
          <div className='bg-zinc-800 p-2 rounded-lg'>
            <Bus className='h-5 w-5 text-blue-400' />
          </div>
          <div>
            <span className='text-xl font-bold text-white'>
              {bus.busNumber}
            </span>
            {bus.liveStatus && (
              <span className='ml-2 bg-green-600 text-white text-xs font-bold px-2 py-1 rounded-full'>
                LIVE
              </span>
            )}
            {bus.destination && (
              <p className='text-sm text-zinc-300 mt-1'>{bus.destination}</p>
            )}
          </div>
        </div>
        <div
          className={`text-xl font-bold ${isSoon ? 'text-green-400' : 'text-blue-400'}`}
        >
          {bus.timeUntilArrival}
        </div>
      </div>
    </motion.div>
  );
}
