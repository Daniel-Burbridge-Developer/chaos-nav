// seedMergedTrips.ts
import { db } from '../db';
import { trips, TripStop } from '../schema/trips'; // Import TripStop type from your updated trips schema
import { InferInsertModel, sql } from 'drizzle-orm';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';
import JSONStream from 'jsonstream';

// Define the interfaces for raw JSON records from your files
interface RawTripJson {
  route_id: string;
  service_id: string;
  trip_id: string; // The ID is named 'trip_id' in your JSON
  direction_id: string;
  trip_headsign: string;
  shape_id: string;
}

interface RawStopTimeJson {
  trip_id: string; // The ID is named 'trip_id' in your JSON
  arrival_time: string;
  departure_time: string;
  stop_id: string;
  stop_sequence: string;
  pickup_type: string;
  drop_off_type: string;
  timepoint: string;
  fare: string;
  zone: string;
  section: string;
}

// The type for the object to insert into the 'trips' table, matching the schema
type MergedTripInsert = InferInsertModel<typeof trips>;

const BATCH_SIZE = 500; // Number of merged trips to insert in one batch

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Helper function to read an entire JSON file using JSONStream and return its contents as an array.
 * This is used for files that can comfortably fit in memory (like stop_times.json for aggregation).
 */
async function readJsonFile<T>(filePath: string): Promise<T[]> {
  return new Promise((resolve, reject) => {
    const records: T[] = [];
    const fileStream = fs.createReadStream(filePath, { encoding: 'utf8' });
    const jsonStream = JSONStream.parse('*');

    fileStream.pipe(jsonStream);

    jsonStream.on('data', (record: T) => {
      records.push(record);
    });

    jsonStream.on('end', () => {
      resolve(records);
    });

    fileStream.on('error', (err) => {
      reject(new Error(`File stream error for ${filePath}: ${err.message}`));
    });
    jsonStream.on('error', (err) => {
      reject(new Error(`JSON parsing error for ${filePath}: ${err.message}`));
    });
  });
}

async function seedMergedTrips() {
  console.log('✨ Starting combined trips and stop_times seeding...');

  // Define paths to your JSON files
  const tripsJsonPath = path.resolve(
    __dirname,
    'transperth_data',
    'trips.json'
  );
  const stopTimesJsonPath = path.resolve(
    __dirname,
    'transperth_data',
    'stopTimes.json'
  ); // Note: changed to stopTimes.json as per your request

  let totalTripsInserted = 0;
  let batchCounter = 0;

  try {
    // --- Step 1: Load and aggregate all stop times into an in-memory Map ---
    console.log('⏳ Aggregating stop times from stopTimes.json...');
    const tripStopsMap = new Map<string, TripStop[]>(); // Map: trip_id (string) -> Array of TripStop

    const rawStopTimes: RawStopTimeJson[] =
      await readJsonFile<RawStopTimeJson>(stopTimesJsonPath);

    rawStopTimes.forEach((rawRecord) => {
      const { trip_id, arrival_time, stop_id, stop_sequence } = rawRecord;

      // Basic validation for stop time records
      if (
        !trip_id ||
        !arrival_time ||
        !stop_id ||
        isNaN(parseInt(stop_sequence, 10))
      ) {
        console.warn(
          `⚠️ Skipping malformed or incomplete stop time record during aggregation: ${JSON.stringify(rawRecord)}`
        );
        return;
      }

      const tripStop: TripStop = {
        id: stop_id, // This 'id' refers to the stop_id within the TripStop object
        arrivalTime: arrival_time,
        stopSequence: parseInt(stop_sequence, 10),
      };

      // Add to map, creating array if trip_id not seen before
      if (!tripStopsMap.has(trip_id)) {
        tripStopsMap.set(trip_id, []);
      }
      tripStopsMap.get(trip_id)?.push(tripStop);
    });

    console.log(
      `✅ Finished aggregating stops for ${tripStopsMap.size} unique trips from stopTimes.json.`
    );

    // --- Step 2: Stream trips.json, merge with aggregated stops, and insert ---
    console.log('⏳ Starting to process and insert trips from trips.json...');
    let mergedTripsBatch: MergedTripInsert[] = [];

    const tripsFileStream = fs.createReadStream(tripsJsonPath, {
      encoding: 'utf8',
    });
    const tripsJsonStream = JSONStream.parse('*');

    tripsFileStream.pipe(tripsJsonStream);

    tripsJsonStream.on('data', async (rawTripRecord: RawTripJson) => {
      tripsJsonStream.pause(); // Pause the stream to process the current record

      const {
        route_id,
        service_id,
        trip_id,
        direction_id,
        trip_headsign,
        shape_id,
      } = rawTripRecord;

      // Basic validation for essential trip fields. 'trip_id' from JSON is the primary key for the row.
      if (!trip_id || !route_id || !service_id) {
        console.warn(
          `⚠️ Skipping malformed or incomplete trip record from trips.json (missing trip_id, route_id, or service_id): ${JSON.stringify(rawTripRecord)}`
        );
        tripsJsonStream.resume();
        return;
      }

      // Parse direction_id to a number, allowing it to be null if invalid/missing
      let parsedDirectionId: number | null = null;
      if (
        direction_id !== null &&
        direction_id !== undefined &&
        direction_id !== ''
      ) {
        const numDirectionId = parseInt(direction_id, 10);
        if (!isNaN(numDirectionId)) {
          parsedDirectionId = numDirectionId;
        } else {
          console.warn(
            `  - Invalid 'direction_id' for trip ID ${trip_id}. Setting to null. Raw: "${direction_id}"`
          );
        }
      }

      // Retrieve the aggregated stops for this trip_id
      // Default to an empty array if no stops are found for this trip (matches nullable jsonb in schema)
      const stopsForThisTrip = tripStopsMap.get(trip_id) || [];

      // Construct the merged object for insertion, mapping JSON's 'trip_id' to schema's 'id'
      const mergedTrip: MergedTripInsert = {
        id: trip_id, // Map 'trip_id' from JSON to the 'id' column in your schema
        route_id: route_id,
        service_id: service_id,
        direction_id: parsedDirectionId,
        trip_headsign: trip_headsign === '' ? null : trip_headsign,
        shape_id: shape_id === '' ? null : shape_id,
        stops: stopsForThisTrip, // Add the aggregated stops array here
      };

      mergedTripsBatch.push(mergedTrip);
      totalTripsInserted++;

      // If the batch is full, insert it into the database
      if (mergedTripsBatch.length >= BATCH_SIZE) {
        batchCounter++;
        console.log(
          `Processing batch ${batchCounter}: Inserting ${mergedTripsBatch.length} merged trips. Total inserted: ${totalTripsInserted}`
        );
        await db
          .insert(trips)
          .values(mergedTripsBatch)
          .onConflictDoUpdate({
            target: trips.id, // Conflict target is the 'id' column in your schema
            set: {
              route_id: sql`excluded.route_id`,
              service_id: sql`excluded.service_id`,
              direction_id: sql`excluded.direction_id`,
              trip_headsign: sql`excluded.trip_headsign`,
              shape_id: sql`excluded.shape_id`,
              stops: sql`excluded.stops`, // Also update the 'stops' column on conflict
            },
          });
        mergedTripsBatch = []; // Clear the batch for the next set of trips
      }

      tripsJsonStream.resume(); // Resume the stream
    });

    tripsJsonStream.on('end', async () => {
      // After all records from trips.json are processed, insert any remaining merged trips in the final batch
      if (mergedTripsBatch.length > 0) {
        batchCounter++;
        console.log(
          `Processing final batch ${batchCounter}: Inserting ${mergedTripsBatch.length} merged trips. Total inserted: ${totalTripsInserted}`
        );
        await db
          .insert(trips)
          .values(mergedTripsBatch)
          .onConflictDoUpdate({
            target: trips.id, // Conflict target is the 'id' column
            set: {
              route_id: sql`excluded.route_id`,
              service_id: sql`excluded.service_id`,
              direction_id: sql`excluded.direction_id`,
              trip_headsign: sql`excluded.trip_headsign`,
              shape_id: sql`excluded.shape_id`,
              stops: sql`excluded.stops`,
            },
          });
      }

      console.log(
        `✅ Merged trips seeding complete! Total trips inserted/updated: ${totalTripsInserted}`
      );
      process.exit(0); // Exit the script successfully
    });

    // --- Error Handling for the Streams ---
    tripsFileStream.on('error', (error) => {
      console.error('❌ File stream error during trips processing:', error);
      process.exit(1);
    });
    tripsJsonStream.on('error', (error) => {
      console.error('❌ JSON parsing error during trips processing:', error);
      process.exit(1);
    });
  } catch (error) {
    console.error('❌ General error during merged trips seeding:', error);
    process.exit(1);
  }
}

seedMergedTrips();
