export const Route = createFileRoute('/bus-routes/')({
  ssr: false,
  component: RouteComponent,
});

const LazyInteractiveMap = lazy(() =>
  import('~/components/bus-map').then((module) => ({
    default: module.BusMap,
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
