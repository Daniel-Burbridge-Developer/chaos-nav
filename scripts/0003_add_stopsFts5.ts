// drizzle/0002_add_stops_fts.ts
import { sql } from 'drizzle-orm';

// The function will receive the Drizzle DB instance as its first argument
export default async function (db: any) {
  // Use 'any' or infer the type if you prefer, but 'any' is fine for quick fixes
  await db.run(sql`
    CREATE VIRTUAL TABLE IF NOT EXISTS stops_fts
    USING fts5(
      name,
      number,
      content='stops',
      content_rowid='rowid'
    );
  `);

  // If you need a `down` migration, you'd add the DROP TABLE statement here:
  // await db.run(sql`DROP TABLE IF EXISTS stops_fts;`);
}
