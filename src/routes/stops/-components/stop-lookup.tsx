import { useForm } from '@tanstack/react-form';
import { Input } from '~/components/ui/shadCnLibrary';
import { z } from 'zod';

const stopLookupSchema = z.object({
  stop: z.string().length(5, 'Stop number must be exactly 5 characters long'),
});

// ADD FUNCTIONALITY TO RESOLVE BUS STOP LOOKUP

const resolveStopLookup = async (
  stopNumber: string
): Promise<{ error?: string; data?: any }> => {
  try {
    const response = await fetch(`/api/bus-stop-lookup/${stopNumber}`);
    if (!response.ok) {
      return { error: `HTTP error! status: ${response.status}` };
    }
    const data = await response.json();
    return { data };
  } catch (error: any) {
    return { error: error.message || 'Unknown error' };
  }
};

const StopLookup = () => {
  const form = useForm({
    validators: {
      onSubmit: stopLookupSchema,
    },
    defaultValues: {
      stop: '',
    },
    onSubmit: async ({ value }) => {
      const result = await resolveStopLookup(value.stop);
      if (result.error) {
        console.error('Error fetching stop data:', result.error);
      } else {
        console.log('Stop data fetched successfully:');
        form.reset();
      }
    },
  });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        form.handleSubmit();
      }}
    >
      <form.Field name='stop'>
        {(field) => (
          <div>
            <Input
              type='text'
              name={field.name}
              placeholder='Enter stop number or name'
              value={field.state.value}
              onBlur={field.handleBlur}
              onChange={(e) => field.setValue(e.target.value)}
              autoFocus
            />
            {field.state.meta.isDirty && field.state.meta.errors.length > 0 && (
              <em className='text-red-500'>
                {field.state.meta.errors
                  .map((error) => error?.message)
                  .join(', ')}
              </em>
            )}
          </div>
        )}
      </form.Field>
    </form>
  );
};

export default StopLookup;
