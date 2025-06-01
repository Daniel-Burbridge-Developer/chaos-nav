import 'dotenv/config';
import { drizzle } from 'drizzle-orm/libsql'; // For Turso/LibSQL
import { stopTimes } from '~/db/schema/stop_times'; // Make sure this path is correct for stopTimes schema
import { createReadStream } from 'node:fs';
import { parse } from 'jsonstream';
import * as path from 'node:path';

async function main() {
  const db = drizzle({
    connection: {
      url: process.env.TURSO_DATABASE_URL!,
      authToken: process.env.TURSO_AUTH_TOKEN!,
    },
  });

  // --- ADJUST FILE PATH TO stop_times.json ---
  // Assuming 'scripts' is a sibling of 'src', and 'stop_times.json' is in 'src/transperth_data/'
  // This will resolve to: <project_root>/src/transperth_data/stop_times.json
  const jsonFilePath = './src/transperth_data/stop_times.json';
  // If your 'transperth_data' is directly under the project root, use:
  // const jsonFilePath = path.resolve(__dirname, '..', 'transperth_data', 'stop_times.json');

  // --- OPTIMIZE: INCREASE BATCH SIZE ---
  // Each batch is one write operation (or transaction). Higher means fewer writes.
  const batchSize = 2500; // Start with 10,000, can go higher (25k, 50k) if memory allows
  // and Turso's max query size isn't hit.

  let recordsProcessed = 0;
  let problematicFieldsCount = 0;
  let batch: (typeof stopTimes.$inferInsert)[] = [];

  console.log('Starting data seeding for stop_times...');
  console.log(`Attempting to read file from: ${jsonFilePath}`);

  const stream = createReadStream(jsonFilePath, { encoding: 'utf8' });
  const parser = parse('*'); // '*' tells jsonstream to emit each top-level object

  stream.pipe(parser);

  parser.on('data', async (data) => {
    // Pause the stream to prevent overwhelming memory while processing
    parser.pause();

    // Helper function to clean and parse integers for optional fields
    const cleanAndParseInteger = (rawValue: any): number | null => {
      if (
        rawValue === undefined ||
        rawValue === null ||
        String(rawValue).trim() === ''
      ) {
        return null; // Return null for undefined, null, or empty strings
      }
      const parsed = parseInt(String(rawValue), 10);
      if (isNaN(parsed) || !isFinite(parsed)) {
        problematicFieldsCount++;
        return null; // Invalid number, treat as null
      }
      return parsed;
    };

    // All fields are strings in JSON, but Drizzle schema expects specific types.
    // .notNull() fields must have valid data. Optional fields can be null.

    // Required fields: tripId, arrivalTime, departureTime, stopId, stopSequence
    // These must be present and valid according to your schema.
    const tripId = String(data.trip_id);
    const arrivalTime = String(data.arrival_time);
    const departureTime = String(data.departure_time);
    const stopId = String(data.stop_id);

    // stop_sequence is integer in schema, string in JSON
    const stopSequence = cleanAndParseInteger(data.stop_sequence);
    if (stopSequence === null) {
      // You might want to handle this more strictly if stopSequence is NOT NULL in your Drizzle schema
      // For now, it will default to 0 if NOT NULL, or be NULL if nullable.
      // If your schema has .notNull() on stopSequence, ensure data is always valid.
      console.warn(
        `[WARNING] stop_sequence for trip_id '${tripId}' is invalid or null. Skipping record.`
      );
      parser.resume(); // Resume to process next record
      return; // Skip this record if a critical field is missing
    }

    // Optional fields (can be null in Drizzle schema)
    const pickupType = cleanAndParseInteger(data.pickup_type);
    const dropOffType = cleanAndParseInteger(data.drop_off_type);
    const timepoint = cleanAndParseInteger(data.timepoint);
    const fare = cleanAndParseInteger(data.fare);
    const zone = cleanAndParseInteger(data.zone);
    const section = cleanAndParseInteger(data.section);

    const stopTimeData = {
      tripId: tripId,
      arrivalTime: arrivalTime,
      departureTime: departureTime,
      stopId: stopId,
      stopSequence: stopSequence,
      pickupType: pickupType,
      dropOffType: dropOffType,
      timepoint: timepoint,
      fare: fare,
      zone: zone,
      section: section,
    };

    batch.push(stopTimeData);
    recordsProcessed++;

    if (batch.length >= batchSize) {
      try {
        await db.insert(stopTimes).values(batch);
        console.log(
          `Inserted ${batch.length} records. Total processed: ${recordsProcessed}. Batches completed: ${recordsProcessed / batchSize}. (Problematic fields encountered: ${problematicFieldsCount})`
        );
        batch = []; // Clear the batch
      } catch (error) {
        console.error('Error inserting batch:', error);
        console.error(
          'Problematic batch content (first 5 records):',
          batch.slice(0, 5)
        );
        throw error; // Re-throw to stop on critical DB error
      } finally {
        parser.resume();
      }
    } else {
      parser.resume();
    }
  });

  parser.on('end', async () => {
    // Insert any remaining records in the last batch
    if (batch.length > 0) {
      try {
        await db.insert(stopTimes).values(batch);
        console.log(
          `Inserted final ${batch.length} records. Total processed: ${recordsProcessed}. (Problematic fields encountered: ${problematicFieldsCount})`
        );
      } catch (error) {
        console.error('Error inserting final batch:', error);
      }
    }
    console.log(
      `\nFinished seeding! Total records inserted: ${recordsProcessed}. Total problematic fields: ${problematicFieldsCount}`
    );
    process.exit(0); // Exit successfully
  });

  parser.on('error', (err) => {
    console.error('Error parsing JSON stream:', err);
    process.exit(1);
  });

  stream.on('error', (err) => {
    console.error('Error reading file stream:', err);
    process.exit(1);
  });
}

main().catch((err) => {
  console.error('An unhandled error occurred during seeding:', err);
  process.exit(1);
});
