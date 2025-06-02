import { db } from '../db';
import { routes } from '../schema/routes';
import { InferInsertModel, sql } from 'drizzle-orm';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url'; // NEW: Import fileURLToPath
import { dirname } from 'node:path'; // NEW: Import dirname
import JSONStream from 'jsonstream';

// Define the expected structure of a single route object from your JSON file
interface RouteJsonData {
  route_id: string;
  agency_id: string;
  route_short_name: string;
  route_long_name: string;
  route_desc: string;
  route_type: string;
  route_url: string;
  route_color: string;
  route_text_color: string;
}

// Define your batch size. Experiment with this number based on your data size and database performance.
const BATCH_SIZE = 5000;

// --- NEW: ESM equivalent of __dirname ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
// --- END NEW ---

async function seedRoutes() {
  console.log('✨ Starting routes seeding for large file...');

  const jsonPath = path.resolve(__dirname, 'transperth_data', 'routes.json'); // This will now resolve correctly
  let currentBatch: InferInsertModel<typeof routes>[] = [];
  let totalRecordsProcessed = 0;
  let batchCounter = 0;

  try {
    const fileStream = fs.createReadStream(jsonPath, { encoding: 'utf8' });
    const jsonStream = JSONStream.parse('*'); // Assuming your JSON is an array at the root

    fileStream.pipe(jsonStream);

    jsonStream.on('data', async (record: RouteJsonData) => {
      jsonStream.pause(); // Pause the stream

      const formattedRoute: InferInsertModel<typeof routes> = {
        id: record.route_id,
        agency_id: record.agency_id,
        short_name: record.route_short_name || null,
        long_name: record.route_long_name || null,
        type: parseInt(record.route_type, 10),
      };

      currentBatch.push(formattedRoute);
      totalRecordsProcessed++;

      if (currentBatch.length >= BATCH_SIZE) {
        batchCounter++;
        console.log(
          `Processing batch ${batchCounter}: Inserting/Updating ${currentBatch.length} records. Total processed: ${totalRecordsProcessed}`
        );
        await db
          .insert(routes)
          .values(currentBatch)
          .onConflictDoUpdate({
            target: routes.id,
            set: {
              agency_id: sql`excluded.agency_id`,
              short_name: sql`excluded.short_name`,
              long_name: sql`excluded.long_name`,
              type: sql`excluded.type`,
            },
          });
        currentBatch = []; // Clear the batch
      }
      jsonStream.resume(); // Resume the stream
    });

    jsonStream.on('end', async () => {
      if (currentBatch.length > 0) {
        batchCounter++;
        console.log(
          `Processing final batch ${batchCounter}: Inserting/Updating ${currentBatch.length} records. Total processed: ${totalRecordsProcessed}`
        );
        await db
          .insert(routes)
          .values(currentBatch)
          .onConflictDoUpdate({
            target: routes.id,
            set: {
              agency_id: sql`excluded.agency_id`,
              short_name: sql`excluded.short_name`,
              long_name: sql`excluded.long_name`,
              type: sql`excluded.type`,
            },
          });
      }
      console.log(
        `✅ Routes seeding complete! Total records processed: ${totalRecordsProcessed}`
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

seedRoutes();
