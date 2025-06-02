import { db } from '../db';
import { stops } from '../schema/stops';
import { InferInsertModel, sql } from 'drizzle-orm';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';
import JSONStream from 'jsonstream';

// Define the interface for a single raw stop object from your JSON file
interface RawStopJson {
  location_type: string;
  parent_station: string;
  stop_id: string;
  stop_code: string;
  stop_name: string;
  stop_desc: string;
  stop_lat: string;
  stop_lon: string;
  zone_id: string; // Can be a string like "FTZ" or a number
  supported_modes: string;
  iptiscode: string;
}

const BATCH_SIZE = 500;

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function seedStops() {
  console.log('✨ Starting stops seeding...');

  const jsonPath = path.resolve(__dirname, 'transperth_data', 'stops.json');
  let stopsToInsert: InferInsertModel<typeof stops>[] = [];
  let totalStopsProcessed = 0;
  let batchCounter = 0;

  // Use a Map to keep track of unique stops within the current batch
  // This helps deduplicate records *before* sending the batch to the DB
  let currentBatchMap = new Map<number, InferInsertModel<typeof stops>>();

  try {
    const fileStream = fs.createReadStream(jsonPath, { encoding: 'utf8' });
    const jsonStream = JSONStream.parse('*');

    fileStream.pipe(jsonStream);

    jsonStream.on('data', async (rawRecord: RawStopJson) => {
      jsonStream.pause();

      const id = parseInt(rawRecord.stop_id, 10);
      const name = rawRecord.stop_name.replace(/^"|"$/g, '');
      const lat = parseFloat(rawRecord.stop_lat);
      const lon = parseFloat(rawRecord.stop_lon);

      // Handle zone_id: if it's "FTZ", store as string. If empty, null. Otherwise, parse as number.
      let zone_id: number | string | null = null;
      if (rawRecord.zone_id === '') {
        zone_id = null;
      } else if (
        isNaN(parseInt(rawRecord.zone_id, 10)) &&
        typeof rawRecord.zone_id === 'string'
      ) {
        // It's a string like "FTZ"
        zone_id = rawRecord.zone_id;
      } else {
        // It's a number string
        zone_id = parseInt(rawRecord.zone_id, 10);
      }

      const supported_modes_array = rawRecord.supported_modes
        .split(';')
        .map((mode) => mode.trim())
        .filter((mode) => mode !== '');

      // Basic validation for critical fields
      if (
        isNaN(id) ||
        isNaN(lat) ||
        isNaN(lon) ||
        (typeof zone_id === 'number' && isNaN(zone_id))
      ) {
        console.warn(
          `⚠️ Skipping malformed or incomplete record (ID, Lat, Lon, or Zone ID issue): ${JSON.stringify(rawRecord)}`
        );
        jsonStream.resume();
        return;
      }

      const stopToInsert: InferInsertModel<typeof stops> = {
        id: id,
        name: name,
        lat: lat,
        lon: lon,
        zone_id: zone_id, // Assign the potentially string or null value
        supported_modes: supported_modes_array,
      };

      // --- Deduplicate within the current batch using the Map ---
      // If we've already seen this stop_id in the current batch, replace it with the latest one
      // This ensures only one entry per stop_id goes into the DB for the current batch.
      currentBatchMap.set(id, stopToInsert);
      // --------------------------------------------------------

      totalStopsProcessed++;

      // If the map size reaches BATCH_SIZE, it's time to process the batch
      if (currentBatchMap.size >= BATCH_SIZE) {
        batchCounter++;
        // Convert the Map values back to an array for insertion
        stopsToInsert = Array.from(currentBatchMap.values());
        console.log(
          `Processing batch ${batchCounter}: Inserting ${stopsToInsert.length} stops. Total processed: ${totalStopsProcessed}`
        );

        await db
          .insert(stops)
          .values(stopsToInsert)
          .onConflictDoUpdate({
            target: stops.id,
            set: {
              name: sql`excluded.name`,
              lat: sql`excluded.lat`,
              lon: sql`excluded.lon`,
              zone_id: sql`excluded.zone_id`,
              supported_modes: sql`excluded.supported_modes`,
            },
          });
        currentBatchMap.clear(); // Clear the map for the next batch
      }

      jsonStream.resume();
    });

    jsonStream.on('end', async () => {
      // Insert any remaining stops in the final batch
      if (currentBatchMap.size > 0) {
        batchCounter++;
        stopsToInsert = Array.from(currentBatchMap.values());
        console.log(
          `Processing final batch ${batchCounter}: Inserting ${stopsToInsert.length} stops. Total processed: ${totalStopsProcessed}`
        );
        await db
          .insert(stops)
          .values(stopsToInsert)
          .onConflictDoUpdate({
            target: stops.id,
            set: {
              name: sql`excluded.name`,
              lat: sql`excluded.lat`,
              lon: sql`excluded.lon`,
              zone_id: sql`excluded.zone_id`,
              supported_modes: sql`excluded.supported_modes`,
            },
          });
      }

      console.log(
        `✅ Stops seeding complete! Total stops inserted/updated: ${totalStopsProcessed}`
      );
      process.exit(0);
    });

    fileStream.on('error', (error) => {
      console.error('❌ File stream error:', error);
      process.exit(1);
    });
    jsonStream.on('error', (error) => {
      console.error('❌ JSON parsing error:', error);
      process.exit(1);
    });
  } catch (error) {
    console.error('❌ General seeding error:', error);
    process.exit(1);
  }
}

seedStops();
