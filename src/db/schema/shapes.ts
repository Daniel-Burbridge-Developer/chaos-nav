import {
  sqliteTable,
  integer,
  text,
  index,
  real,
} from 'drizzle-orm/sqlite-core';

export const shapes = sqliteTable(
  'shapes',
  {
    id: integer('id').primaryKey({ autoIncrement: true }), // A primary key for each record
    shape_id: text('shape_id').notNull(), // As it's a string in your JSON
    shape_pt_lat: real('shape_pt_lat').notNull(), // Latitude as a floating-point number
    shape_pt_lon: real('shape_pt_lon').notNull(), // Longitude as a floating-point number
    shape_pt_sequence: integer('shape_pt_sequence').notNull(), // Sequence as an integer
  },
  (shapes) => [
    // Indexing `shape_id` will be useful for querying shapes
    index('shape_id_idx').on(shapes.shape_id),
    // Consider a composite index for shape_id and sequence if you often query by both
    index('shape_id_sequence_idx').on(
      shapes.shape_id,
      shapes.shape_pt_sequence
    ),
  ]
);

export type Shape = typeof shapes.$inferSelect;
