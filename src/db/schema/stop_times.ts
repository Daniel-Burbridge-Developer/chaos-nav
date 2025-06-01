import { pgTable, serial, varchar, integer, time } from 'drizzle-orm/pg-core';

export const stopTimes = pgTable('stop_times', {
  id: serial('id').primaryKey(),
  tripId: varchar('trip_id', { length: 255 }).notNull(),
  arrivalTime: time('arrival_time').notNull(),
  departureTime: time('departure_time').notNull(),
  stopId: varchar('stop_id', { length: 255 }).notNull(),
  stopSequence: integer('stop_sequence').notNull(),
  pickupType: integer('pickup_type'),
  dropOffType: integer('drop_off_type'),
  timepoint: integer('timepoint'),
  fare: integer('fare'),
  zone: integer('zone'),
  section: integer('section'),
});
