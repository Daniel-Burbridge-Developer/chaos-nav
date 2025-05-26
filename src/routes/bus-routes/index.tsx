import { createFileRoute } from '@tanstack/react-router';
import { InteractiveMap } from './-components/map';
import { Suspense, lazy } from 'react';

export const Route = createFileRoute('/bus-routes/')({
  ssr: false,
  component: RouteComponent,
});

// Have to have this weird lazy stuff to make the map markers work

const LazyInteractiveMap = lazy(() =>
  import('./-components/map').then((module) => ({
    default: module.InteractiveMap,
  }))
);

function RouteComponent() {
  return (
    <div className='p-4'>
      <h1 className='text-xl font-bold mb-4'>Interactive Bus Map</h1>
      <Suspense fallback={<div>Loading Map...</div>}>
        <LazyInteractiveMap />
      </Suspense>
    </div>
  );
}
