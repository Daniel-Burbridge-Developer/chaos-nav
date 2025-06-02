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

// Mock data for demonstration
const mockRoute: BusRoute = {
  id: '1',
  routeNumber: '42',
  routeName: 'Downtown Express',
  origin: 'Central Station',
  destination: 'Airport Terminal',
  color: '#3B82F6',
  isActive: true,
  stops: [
    {
      id: '1',
      name: 'Central Station',
      latitude: 40.7128,
      longitude: -74.006,
      arrivalTime: '2 min',
    },
    {
      id: '2',
      name: 'City Hall',
      latitude: 40.713,
      longitude: -74.0065,
      arrivalTime: '8 min',
    },
    {
      id: '3',
      name: 'Union Square',
      latitude: 40.7135,
      longitude: -74.007,
      arrivalTime: '15 min',
    },
    {
      id: '4',
      name: 'Grand Central',
      latitude: 40.714,
      longitude: -74.0075,
      arrivalTime: '22 min',
    },
    {
      id: '5',
      name: 'Airport Terminal',
      latitude: 40.7145,
      longitude: -74.008,
      arrivalTime: '35 min',
    },
  ],
  schedule: [
    {
      departureTime: '2:15 PM',
      arrivalTime: '2:50 PM',
      frequency: 'Every 15 min',
    },
    {
      departureTime: '2:30 PM',
      arrivalTime: '3:05 PM',
      frequency: 'Every 15 min',
    },
    {
      departureTime: '2:45 PM',
      arrivalTime: '3:20 PM',
      frequency: 'Every 15 min',
    },
  ],
};

// Add this after the mockRoute definition:
const featuredRoutes: BusRoute[] = [
  mockRoute,
  {
    id: '2',
    routeNumber: '15',
    routeName: 'University Line',
    origin: 'Campus North',
    destination: 'Downtown Mall',
    color: '#10B981',
    isActive: true,
    stops: [
      {
        id: '6',
        name: 'Campus North',
        latitude: 40.715,
        longitude: -74.009,
        arrivalTime: '5 min',
      },
      {
        id: '7',
        name: 'Student Center',
        latitude: 40.7155,
        longitude: -74.0095,
        arrivalTime: '12 min',
      },
      {
        id: '8',
        name: 'Library',
        latitude: 40.716,
        longitude: -74.01,
        arrivalTime: '18 min',
      },
      {
        id: '9',
        name: 'Downtown Mall',
        latitude: 40.7165,
        longitude: -74.0105,
        arrivalTime: '25 min',
      },
    ],
    schedule: [
      {
        departureTime: '2:20 PM',
        arrivalTime: '2:45 PM',
        frequency: 'Every 20 min',
      },
      {
        departureTime: '2:40 PM',
        arrivalTime: '3:05 PM',
        frequency: 'Every 20 min',
      },
    ],
  },
];

// Update the component to show featured routes initially:

export default function BusRoutesApp() {
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
          <BusMap selectedRoute={selectedRoute} />
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
