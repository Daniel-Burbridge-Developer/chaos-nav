import 'dotenv/config';
import { drizzle } from 'drizzle-orm/libsql';
import { routes } from './schema/routes'; // Adjust the path if your schema file is elsewhere
import routeList from '../transperth_data/routes.json'; // Adjust this path to your JSON file

async function main() {
  const db = drizzle({
    connection: {
      url: process.env.TURSO_DATABASE_URL!,
      authToken: process.env.TURSO_AUTH_TOKEN!,
    },
  });

  console.log('Starting routes data seeding...');

  // Prepare the data for bulk insert
  const rows = routeList.map((route) => ({
    route_id: route.route_id,
    agency_id: route.agency_id,
    route_short_name: route.route_short_name,
    route_long_name: route.route_long_name,
    route_desc: route.route_desc,
    route_type: route.route_type,
    route_url: route.route_url,
    route_color: route.route_color,
    route_text_color: route.route_text_color,
  }));

  // Bulk insert
  // Drizzle's insert method can handle arrays for bulk inserts
  await db.insert(routes).values(rows);

  console.log(`Successfully inserted ${rows.length} routes.`);
}

main().catch((err) => {
  console.error('Error during routes data seeding:', err);
  process.exit(1);
});
