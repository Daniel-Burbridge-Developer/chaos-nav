import { createFileRoute } from '@tanstack/react-router';
import { InteractiveMap } from './-components/map';

export const Route = createFileRoute('/bus-routes/')({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <div className='p-4'>
      <h1 className='text-xl font-bold mb-4'>Interactive Bus Map</h1>
      <InteractiveMap />
    </div>
  );
}
