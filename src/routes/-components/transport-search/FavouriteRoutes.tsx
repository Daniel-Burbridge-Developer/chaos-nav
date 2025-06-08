// //// STARTING POINT FOR FAVOURITE ROUTES

// 'use client';

// import { useState, useEffect } from 'react';
// import { MapPin, Navigation, Zap, Clock, Users, Star } from 'lucide-react';
// import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card';
// import { Badge } from '~/components/ui/badge';
// import { Button } from '~/components/ui/button';
// import { useSelectedRoutesStore } from '~/stores/selectedRoutesStore'; // Import your store
// import type { Trip } from '~/db/schema/trips'; // Import Trip type

// // It's helpful to define a consistent set of colors for routes
// const routeColors = [
//   '#EF4444',
//   '#3B82F6',
//   '#10B981',
//   '#F59E0B',
//   '#6366F1',
//   '#EC4899',
// ];

// export function BusMap() {
//   const { selectedRoutes } = useSelectedRoutesStore(); // Get selectedRoutes from the store

//   const [currentLocation, setCurrentLocation] = useState<{
//     lat: number;
//     lng: number;
//   } | null>(null);

//   useEffect(() => {
//     // Get user's current location
//     if (navigator.geolocation) {
//       navigator.geolocation.getCurrentPosition(
//         (position) => {
//           setCurrentLocation({
//             lat: position.coords.latitude,
//             lng: position.coords.longitude,
//           });
//         },
//         (error) => {
//           console.error('Error getting location:', error);
//         }
//       );
//     }
//   }, []);

//   if (selectedRoutes.length === 0) {
//     return (
//       <div className='flex-1 flex items-center justify-center'>
//         <div className='text-center space-y-4'>
//           <div className='w-24 h-24 mx-auto bg-muted rounded-full flex items-center justify-center'>
//             <MapPin className='w-12 h-12 text-muted-foreground' />
//           </div>
//           <div className='space-y-2'>
//             <h3 className='text-lg font-semibold'>Select Routes to View</h3>
//             <p className='text-muted-foreground'>
//               Search for bus routes in the sidebar to view their trips on the
//               map.
//             </p>
//           </div>
//         </div>
//       </div>
//     );
//   }

//   return (
//     <div className='flex-1 space-y-6'>
//       {selectedRoutes.map((selectedRoute, routeIndex) => (
//         <div
//           key={selectedRoute.name}
//           className='space-y-6 border-b pb-6 last:border-b-0 last:pb-0'
//         >
//           {/* Route Header */}
//           <Card>
//             <CardHeader>
//               <div className='flex items-center justify-between'>
//                 <div className='flex items-center gap-3'>
//                   <Badge
//                     variant='secondary'
//                     className='text-lg px-3 py-1'
//                     style={{
//                       backgroundColor:
//                         routeColors[routeIndex % routeColors.length] + '20',
//                       color: routeColors[routeIndex % routeColors.length],
//                     }}
//                   >
//                     {selectedRoute.name}{' '}
//                     {/* Display the route name (bus number) */}
//                   </Badge>
//                   <div>
//                     <CardTitle className='text-xl'>
//                       Route {selectedRoute.name}
//                     </CardTitle>
//                     {/* You might not have origin/destination for all trips readily available here,
//                         but you can derive it from the trips data if needed.
//                         For now, I'll remove the placeholder.
//                     */}
//                     {/* <p className='text-muted-foreground'>
//                       Origin → Destination
//                     </p> */}
//                   </div>
//                 </div>
//                 <div className='flex items-center gap-2'>
//                   {/* You might add logic to determine if any trip on this route is active */}
//                   {/* <Badge
//                     variant='outline'
//                     className='bg-green-50 text-green-700 border-green-200'
//                   >
//                     <div className='w-2 h-2 bg-green-500 rounded-full mr-1' />
//                     Active
//                   </Badge> */}
//                   <Button variant='outline' size='sm'>
//                     <Navigation className='w-4 h-4 mr-2' />
//                     Get Directions
//                   </Button>
//                 </div>
//               </div>
//             </CardHeader>
//           </Card>

//           {/* Individual Trips Display */}
//           <h3 className='text-lg font-semibold mt-4'>
//             Trips for Route {selectedRoute.name}
//           </h3>
//           <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'>
//             {selectedRoute.trips.map((trip: Trip, tripIndex: number) => (
//               <Card key={trip.id} className='relative'>
//                 <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
//                   <CardTitle className='text-md font-medium'>
//                     Trip{' '}
//                     {trip.trip_short_name ||
//                       trip.trip_headsign ||
//                       trip.id.substring(0, 8)}
//                   </CardTitle>
//                   <Badge
//                     variant='secondary'
//                     className='text-xs'
//                     style={{
//                       backgroundColor:
//                         routeColors[routeIndex % routeColors.length],
//                       color: 'white',
//                     }}
//                   >
//                     {trip.direction_id === 0 ? 'Outbound' : 'Inbound'}
//                   </Badge>
//                 </CardHeader>
//                 <CardContent className='space-y-2'>
//                   <div className='flex items-center text-sm text-muted-foreground'>
//                     <MapPin className='mr-2 h-4 w-4' />
//                     <span>{trip.trip_headsign || 'N/A'}</span>
//                   </div>
//                   <div className='flex items-center text-sm text-muted-foreground'>
//                     <Clock className='mr-2 h-4 w-4' />
//                     <span>Start Time: {trip.start_time || 'N/A'}</span>
//                   </div>
//                   {/* You can add more trip-specific details here */}
//                 </CardContent>
//               </Card>
//             ))}
//           </div>
//         </div>
//       ))}

//       {/* Map Area - Simplified for demonstration as full map integration is complex */}
//       <Card className='h-[500px]'>
//         <CardContent className='p-0 h-full'>
//           <div className='w-full h-full bg-gradient-to-br from-blue-50 to-indigo-100 rounded-lg flex items-center justify-center relative overflow-hidden'>
//             {/* Simulated Map Background */}
//             <div className='absolute inset-0 opacity-20'>
//               <div className='absolute top-10 left-10 w-32 h-32 bg-green-200 rounded-full' />
//               <div className='absolute top-32 right-20 w-24 h-24 bg-blue-200 rounded-full' />
//               <div className='absolute bottom-20 left-32 w-28 h-28 bg-purple-200 rounded-full' />
//             </div>

//             {/* Current Location */}
//             {currentLocation && (
//               <div className='absolute bottom-4 left-4'>
//                 <div className='bg-blue-500 w-3 h-3 rounded-full animate-pulse' />
//               </div>
//             )}
//             <div className='text-center text-muted-foreground'>
//               <MapPin className='w-12 h-12 mx-auto mb-2' />
//               <p>
//                 Map visualization of selected routes and trips would go here.
//               </p>
//               <p>This is a placeholder for actual map integration.</p>
//             </div>
//           </div>
//         </CardContent>
//       </Card>

//       {/* Actions (can be moved or adapted to selected routes) */}
//       <div className='space-y-2'>
//         <Button className='w-full'>
//           <Star className='w-4 h-4 mr-2' />
//           Manage Favorites
//         </Button>
//         <Button variant='outline' className='w-full'>
//           <Users className='w-4 h-4 mr-2' />
//           Share Selected Routes
//         </Button>
//       </div>
//     </div>
//   );
// }
