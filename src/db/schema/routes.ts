import { pgTable, integer, text, index } from 'drizzle-orm/pg-core';

export const routes = pgTable(
  'routes',
  {
    id: text('id').primaryKey().notNull().unique(),
    agency_id: text('agency_id').notNull(),
    short_name: text('short_name'),
    long_name: text('long_name'),
    type: integer('type').notNull(),
  },
  (routes) => [
    index('short_name_idx').on(routes.short_name),
    index('long_name_idx').on(routes.long_name),
  ]
);

export type Route = typeof routes.$inferSelect;
