import { useState, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useDebounce } from '~/hooks/use-debounce';
import { fetchStopSuggestions } from '~/lib/api';
import type { StopSuggestion } from '~/lib/types';
import { Search, Loader2 } from 'lucide-react';

interface StopSearchProps {
  onAddStop: (stopNumber: string) => boolean;
}

export function StopSearch({ onAddStop }: StopSearchProps) {
  const [inputValue, setInputValue] = useState('');
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
    staleTime: Number.POSITIVE_INFINITY,
    retry: false,
  });

  const handleAddStop = () => {
    const success = onAddStop(inputValue);
    if (success) {
      setInputValue('');
      setShowSuggestions(false);
    }
  };

  const handleSelect = (suggestion: StopSuggestion) => {
    const success = onAddStop(suggestion.number);
    if (success) {
      setInputValue('');
    } else {
      setInputValue(suggestion.number);
    }
    setShowSuggestions(false);
    inputRef.current?.focus();
  };

  const handleBlur = () =>
    setTimeout(() => {
      if (!suggestionsRef.current?.contains(document.activeElement))
        setShowSuggestions(false);
    }, 100);

  return (
    <div className='relative'>
      <div className='flex flex-col sm:flex-row items-center gap-4'>
        <div className='relative w-full'>
          <input
            ref={inputRef}
            type='text'
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onFocus={() => setShowSuggestions(true)}
            onBlur={handleBlur}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleAddStop();
            }}
            placeholder='Enter Stop Number or Name'
            className='w-full p-3 pl-10 rounded-lg bg-zinc-700 border border-zinc-600 text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all'
          />
          <Search className='absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-400' />
        </div>
        <button
          onClick={handleAddStop}
          className='w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white py-3 px-6 rounded-lg font-bold transition-colors flex items-center justify-center gap-2'
        >
          Add Stop
        </button>
      </div>

      {showSuggestions && suggestions.length > 0 && (
        <div
          ref={suggestionsRef}
          className='absolute z-10 w-full top-full mt-2 bg-zinc-700 border border-zinc-600 rounded-lg shadow-lg max-h-60 overflow-y-auto'
        >
          {suggestions.map((suggestion) => (
            <div
              key={suggestion.id}
              onClick={() => handleSelect(suggestion)}
              className='p-3 hover:bg-zinc-600 cursor-pointer border-b border-zinc-600 transition-colors'
            >
              <p className='text-white font-semibold'>{suggestion.name}</p>
              <p className='text-zinc-400 text-sm'>
                Stop Number: {suggestion.number}
              </p>
            </div>
          ))}
        </div>
      )}

      {isFetching && (
        <div className='absolute top-3 right-3 sm:right-[120px] text-blue-400'>
          <Loader2 className='h-5 w-5 animate-spin' />
        </div>
      )}

      {error && (
        <p className='mt-2 p-3 text-sm bg-red-500/10 text-red-300 border border-red-500 rounded'>
          Error: {error.message}
        </p>
      )}
    </div>
  );
}
