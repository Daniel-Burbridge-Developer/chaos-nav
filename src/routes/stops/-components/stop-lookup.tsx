// src/routes/stops/-components/stop-lookup.tsx

import { useForm } from '@tanstack/react-form';
import { Input } from '~/components/ui/shadCnLibrary';
import { z } from 'zod';
import useDebounce from '~/hooks/useDebounce';
import { useQuery } from '@tanstack/react-query'; // Ensure this is v4 or later for placeholderData
import { Loader } from 'lucide-react';
import { FC, useState } from 'react';

// Define the Stop type, assuming it's consistent with your schema and API response
interface Stop {
  id: number; // Corresponds to 'number' in your schema, but often referred to as 'id'
  name: string;
  lat: number | null;
  lon: number | null;
  zone_id: string | null;
  supported_modes: string[] | null;
}

// Updated Zod schema for the search input.
// It now allows any non-empty string, as the fuzzy search API handles the logic.
const stopLookupSchema = z.object({
  searchQuery: z.string().min(1, 'Please enter a stop number or name.'),
});

// Updated props to reflect that a full Stop object is selected
interface StopLookupProps {
  onSelectStop: (stop: Stop) => void; // Renamed from onFormSubmit, now accepts Stop object
}

/**
 * Fetches stop suggestions from the /api/stops endpoint based on the debounced input.
 * @param debouncedInput The debounced search query.
 * @returns An array of Stop objects.
 */
const fetchSuggestions = async (debouncedInput: string): Promise<Stop[]> => {
  if (!debouncedInput) {
    return []; // Don't fetch if input is empty
  }
  console.log('Fetching suggestions for:', debouncedInput);
  // Using the new /api/stops endpoint for fuzzy search
  const response = await fetch(
    `/api/stops/${encodeURIComponent(debouncedInput)}`
  );
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  const json: Stop[] = await response.json(); // The API directly returns an array of Stop objects
  return json || [];
};

const StopLookup: FC<StopLookupProps> = ({ onSelectStop }) => {
  const [inputValue, setInputValue] = useState('');

  const form = useForm({
    validators: {
      // The onSubmit validator now validates the 'searchQuery' field
      onSubmit: stopLookupSchema,
    },
    defaultValues: {
      searchQuery: '', // Renamed from 'stop' to 'searchQuery'
    },
    onSubmit: async ({ value }) => {
      // When the form is submitted (e.g., by pressing Enter),
      // we try to find an exact match from the current suggestions
      // or select the first suggestion if available.
      const query = value.searchQuery.toLowerCase();

      // Ensure 'suggestions' is treated as an array of Stop objects
      const currentSuggestions: Stop[] = suggestions || [];

      const exactMatch = currentSuggestions.find(
        (s) => s.id.toString() === query || s.name.toLowerCase() === query
      );

      if (exactMatch) {
        onSelectStop(exactMatch);
      } else if (currentSuggestions.length > 0) {
        // Check if array has elements before accessing index 0
        onSelectStop(currentSuggestions[0]);
      }

      form.reset();
      setInputValue(''); // Clear input after submission/selection
    },
  });

  const normalizedInput = inputValue.trim(); // Trim whitespace
  const debouncedInput = useDebounce(normalizedInput, 300);

  const { data: suggestions = [], isFetching } = useQuery<Stop[]>({
    queryKey: ['stop-suggestions', debouncedInput], // Updated query key
    queryFn: () => fetchSuggestions(debouncedInput),
    // Enable query only if debounced input is at least 2 characters long
    // (fuzzy search usually needs more than 1 character to be useful)
    enabled: debouncedInput.length >= 2,
    staleTime: 1000 * 60 * 60, // 1 hour stale time
    // 'keepPreviousData' is deprecated in Tanstack Query v4+. Use 'placeholderData' instead.
    placeholderData: (previousData) => previousData, // Keeps previous data while new data is fetching
  });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        form.handleSubmit();
      }}
    >
      {/* All children of form.Field must be wrapped in a single React Fragment or JSX element */}
      <form.Field name='searchQuery'>
        {(field) => (
          <div className='relative'>
            {' '}
            {/* Wrapped children in a single div */}
            <Input
              type='text'
              name={field.name}
              placeholder='Enter stop number or name' // Updated placeholder
              value={field.state.value}
              onBlur={field.handleBlur}
              onChange={(e) => {
                field.setValue(e.target.value);
                setInputValue(e.target.value);
              }}
              autoFocus
              autoComplete='off'
              className='w-full p-3 pr-10 rounded-lg border border-zinc-600 bg-zinc-800 text-white placeholder-zinc-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent'
            />
            {isFetching && (
              <span
                className='absolute right-3 top-1/2 -translate-y-1/2 text-gray-400'
                aria-label='Loading'
              >
                <Loader className='w-5 h-5 animate-spin' />
              </span>
            )}
            {field.state.meta.isDirty && field.state.meta.errors.length > 0 && (
              <em className='text-red-500 text-sm mt-1 block'>
                {field.state.meta.errors
                  .map((error) => error?.message)
                  .join(', ')}
              </em>
            )}
            {/* Display suggestions only if input is not empty and there are suggestions */}
            {normalizedInput.length > 0 && suggestions.length > 0 && (
              <ul className='bg-white text-black rounded shadow mt-2 z-10 absolute w-full max-h-60 overflow-y-auto border border-gray-200'>
                {suggestions.map((s: Stop) => (
                  <li
                    key={s.id}
                    className='p-3 hover:bg-gray-100 cursor-pointer flex justify-between items-center'
                    onClick={() => {
                      // When a suggestion is clicked, directly select it
                      onSelectStop(s);
                      form.reset(); // Reset form and clear input
                      setInputValue('');
                    }}
                  >
                    <span className='font-medium text-gray-800'>{s.name}</span>
                    <span className='text-sm text-gray-500'>({s.id})</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </form.Field>
    </form>
  );
};

export default StopLookup;
