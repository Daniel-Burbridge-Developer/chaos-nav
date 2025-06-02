import { createFileRoute } from '@tanstack/react-router';
import { Suspense, lazy } from 'react';

import { useState } from 'react';
import { AppSidebar } from '~/components/app-sidebar';
import { BusMap } from '~/components/bus-map';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '~/components/ui/breadcrumb';
import { Separator } from '~/components/ui/separator';
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from '~/components/ui/sidebar';
import type { BusRoute } from '../../types/bus-routes';

export const Route = createFileRoute('/')({
  ssr: false,
  component: RouteComponent,
});

const LazyInteractiveMap = lazy(() =>
  import('~/components/bus-map').then((module) => ({
    default: module.BusMap,
  }))
);

export default function RouteComponent() {
  const [selectedRoute, setSelectedRoute] = useState<BusRoute | null>(null);
  const [featuredRoutesVisible, setFeaturedRoutesVisible] = useState(true);

  const handleRouteSelect = (route: BusRoute) => {
    setSelectedRoute(route);
    setFeaturedRoutesVisible(false);
  };

  return (
    <SidebarProvider>
      <AppSidebar
        onRouteSelect={handleRouteSelect}
        selectedRoute={selectedRoute}
      />
      <SidebarInset>
        <header className='flex h-16 shrink-0 items-center gap-2 border-b px-4'>
          <SidebarTrigger className='-ml-1' />
          <Separator orientation='vertical' className='mr-2 h-4' />
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem className='hidden md:block'>
                <BreadcrumbLink href='#'>Bus Routes</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator className='hidden md:block' />
              <BreadcrumbItem>
                <BreadcrumbPage>
                  {selectedRoute
                    ? `Route ${selectedRoute.routeNumber}`
                    : 'Live Map'}
                </BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </header>
        <div className='flex flex-1 flex-col gap-4 p-4'>
          <Suspense fallback={<div>Loading Map...</div>}>
            <LazyInteractiveMap selectedRoute={selectedRoute} />
          </Suspense>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
