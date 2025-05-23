import { createFileRoute } from '@tanstack/react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BusStopTracker } from './-components/bus-stop-tracker';

export const Route = createFileRoute('/stops/')({
  component: RouteComponent,
});

// Create a client
const queryStopsClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000000 * 60, // 1000 minute
      retry: 1,
    },
  },
});

export default function RouteComponent() {
  return (
    <QueryClientProvider client={queryStopsClient}>
      <div className='min-h-screen bg-zinc-900 text-zinc-100 p-4 md:p-6'>
        <BusStopTracker />
      </div>
    </QueryClientProvider>
  );
}
