import 'dotenv/config';
import { drizzle } from 'drizzle-orm/libsql';
import { trips } from './schema/trips'; // Adjust path if your schema file is elsewhere
import tripList from '../transperth_data/trips.json'; // **Adjust this path** to your actual JSON file

// Define the batch size
const BATCH_SIZE = 1000;

async function main() {
  const db = drizzle({
    connection: {
      url: process.env.TURSO_DATABASE_URL!,
      authToken: process.env.TURSO_AUTH_TOKEN!,
    },
  });

  console.log('Starting trips data seeding with batching...');
  console.log(`Total trips to insert: ${tripList.length}`);
  console.log(`Batch size: ${BATCH_SIZE}`);

  let insertedCount = 0;

  // Loop through the data in batches
  for (let i = 0; i < tripList.length; i += BATCH_SIZE) {
    const batch = tripList.slice(i, i + BATCH_SIZE);

    // Prepare the data for the current batch
    const rows = batch.map((trip) => ({
      route_id: trip.route_id,
      service_id: trip.service_id,
      trip_id: trip.trip_id,
      direction_id: trip.direction_id,
      trip_headsign: trip.trip_headsign,
      shape_id: trip.shape_id,
    }));

    try {
      // Insert the current batch
      await db.insert(trips).values(rows);
      insertedCount += rows.length;
      console.log(
        `Inserted batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(tripList.length / BATCH_SIZE)}. Total inserted: ${insertedCount}`
      );
    } catch (err) {
      console.error(`Error inserting batch starting at index ${i}:`, err);
      // Decide whether to throw the error and stop, or continue with the next batch
      throw err; // Re-throw to stop the process on error
    }
  }

  console.log(
    `\nAll batches processed. Successfully inserted ${insertedCount} total trips.`
  );
}

main().catch((err) => {
  console.error('An unhandled error occurred during trips data seeding:', err);
  process.exit(1);
});
