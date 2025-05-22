import 'dotenv/config';
import { drizzle } from 'drizzle-orm/libsql';
import { stops } from './schema/stops';
import stopList from '../../transperth_data/stops.json';

async function main() {
  const db = drizzle({
    connection: {
      url: process.env.TURSO_DATABASE_URL!,
      authToken: process.env.TURSO_AUTH_TOKEN!,
    },
  });

  // Prepare the data for bulk insert
  const rows = stopList.map((stop) => ({
    name: stop.name,
    number: stop.number,
  }));

  // Bulk insert
  await db.insert(stops).values(rows);

  console.log(`Inserted ${rows.length} stops.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
