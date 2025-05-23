import { useState } from 'react';
import { StopSearch } from './stop-search';
import { StopCard } from './stop-card';
import { AnimatePresence, motion } from 'framer-motion';

export function BusStopTracker() {
  const [stops, setStops] = useState<string[]>([]);

  const addStop = (stopNumber: string) => {
    const trimmed = stopNumber.trim();
    if (trimmed && !stops.includes(trimmed)) {
      setStops([...stops, trimmed]);
      return true;
    }
    return false;
  };

  const removeStop = (stopNumber: string) => {
    setStops(stops.filter((stop) => stop !== stopNumber));
  };

  return (
    <div className='flex flex-col items-center'>
      <div className='bg-zinc-800 p-6 rounded-2xl shadow-2xl w-full max-w-3xl border border-zinc-700 mb-6'>
        <h1 className='text-3xl md:text-4xl font-extrabold text-white mb-4 text-center flex items-center justify-center gap-2'>
          <span className='text-2xl md:text-3xl'>🚍</span> Transperth Multi-Stop
          Live Viewer
        </h1>

        <StopSearch onAddStop={addStop} />

        {stops.length > 0 && (
          <p className='text-center text-zinc-400 text-sm mt-4'>
            Showing live data for {stops.length} stop
            {stops.length > 1 ? 's' : ''}.
          </p>
        )}
      </div>

      <div className='w-full max-w-3xl flex flex-col gap-6'>
        <AnimatePresence>
          {stops.map((stop) => (
            <motion.div
              key={stop}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: -100 }}
              transition={{ duration: 0.3 }}
            >
              <StopCard stopNumber={stop} onRemove={removeStop} />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
