import { createFileRoute } from '@tanstack/react-router';
// Assuming StopLookup and StopCard are in the same relative path
import StopLookup from './-components/stop-lookup';
import StopCard from './-components/stop-card'; // Assuming StopCard now accepts a Stop object
import { useState } from 'react';
import { X } from 'lucide-react';

// Define the Stop type based on your schema for clarity and type safety
// (Assuming this type is either globally available or would be imported from a shared schema file)
interface Stop {
  id: number; // Corresponds to 'number' in your schema, but often referred to as 'id'
  name: string;
  lat: number | null;
  lon: number | null;
  zone_id: string | null;
  supported_modes: string[] | null;
}

export const Route = createFileRoute('/stops/')({
  component: RouteComponent,
});

function RouteComponent() {
  // stopList now stores full Stop objects
  const [stopList, setStopList] = useState<Stop[]>([]);

  // Function to handle a selected stop from StopLookup
  const handleStopSelect = (selectedStop: Stop) => {
    setStopList((prev) => {
      // Check if the stop (by its ID) is already in the list to prevent duplicates
      if (prev.some((s) => s.id === selectedStop.id)) {
        return prev;
      }
      return [...prev, selectedStop];
    });
  };

  // Function to remove a stop from the list
  const handleRemoveStop = (stopIdToRemove: number) => {
    setStopList((prev) => prev.filter((s) => s.id !== stopIdToRemove));
  };

  return (
    <div className='min-h-screen bg-gray-600 p-4 md:p-8'>
      <div className='max-w-xl mx-auto bg-zinc-700 shadow-md rounded-2xl p-6'>
        <h1 className='text-2xl font-bold text-white mb-4 text-center'>
          Stop Lookup
        </h1>
        <div>
          {/* StopLookup now calls onSelectStop with the full Stop object */}
          <StopLookup onSelectStop={handleStopSelect} />
        </div>
        {stopList.length > 0 && (
          <div className='mt-6 space-y-4'>
            {stopList.map(
              (
                stop // Iterate over Stop objects
              ) => (
                <div key={stop.id} className='relative'>
                  {' '}
                  {/* Use stop.id as the key */}
                  <button
                    className='absolute top-2 right-2 z-10 p-1 rounded-full bg-zinc-800 hover:bg-zinc-600 text-white'
                    aria-label='Remove stop'
                    onClick={() => handleRemoveStop(stop.id)} // Pass stop.id to remove handler
                  >
                    <X size={16} />
                  </button>
                  {/* Pass the full Stop object to StopCard */}
                  <StopCard stop={stop} />
                </div>
              )
            )}
          </div>
        )}
      </div>
    </div>
  );
}
