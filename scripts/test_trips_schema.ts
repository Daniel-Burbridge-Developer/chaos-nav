import { TripSelectZodSchema } from 'src/schemas/tripSchema';

const sample = {
  id: 'abc',
  routeId: 'route-1',
  serviceId: 'service-1',
  directionId: 0,
  tripHeadsign: 'City',
  shapeId: 'shape-1',
  stops: [
    { id: 'stop-1', arrivalTime: '10:00', stopSequence: 1 },
    { id: 'stop-2', arrivalTime: '10:10', stopSequence: 2 },
  ],
};

const result = TripSelectZodSchema.safeParse(sample);
console.log(result.success, result.error);
