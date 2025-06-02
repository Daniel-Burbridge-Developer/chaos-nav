import { pgTable, jsonb, integer } from 'drizzle-orm/pg-core';

export type ShapePoint = {
  lat: number;
  lon: number;
  sequence: number;
};

export const shapes = pgTable('shapes', {
  id: integer('id').notNull().unique().primaryKey(),
  points: jsonb('points').$type<ShapePoint[]>().notNull(),
});

export type Shape = typeof shapes.$inferSelect;
