import { db } from '../db';
import { shapes, ShapePoint } from '../schema/shapes'; // Assuming ShapePoint is defined in your schema
import { InferInsertModel, sql } from 'drizzle-orm';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';
import JSONStream from 'jsonstream';

// Define the interface for a single raw point object from your JSON file
interface RawShapePointJson {
  shape_id: string;
  shape_pt_lat: string;
  shape_pt_lon: string;
  shape_pt_sequence: string;
}

// Batch size for inserting complete shapes
const BATCH_SIZE = 500;

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function seedShapes() {
  console.log('✨ Starting shapes seeding for large file...');

  const jsonPath = path.resolve(__dirname, 'transperth_data', 'shapes.json');
  let currentBatch: InferInsertModel<typeof shapes>[] = [];
  let totalPointsProcessed = 0; // Total individual points processed from JSON
  let totalShapesInserted = 0; // Total complete shapes inserted into DB

  // Variables to aggregate points for the current shape being built
  let currentShapeId: number | null = null;
  let currentShapePoints: ShapePoint[] = [];
  let batchCounter = 0;

  try {
    const fileStream = fs.createReadStream(jsonPath, { encoding: 'utf8' });
    const jsonStream = JSONStream.parse('*'); // This will emit each individual object from the JSON array

    fileStream.pipe(jsonStream);

    jsonStream.on('data', async (rawRecord: RawShapePointJson) => {
      jsonStream.pause(); // Pause the stream to process the current record

      // 1. Convert string values from JSON to their correct numeric types
      const shapeId = parseInt(rawRecord.shape_id, 10);
      const lat = parseFloat(rawRecord.shape_pt_lat);
      const lon = parseFloat(rawRecord.shape_pt_lon);
      const sequence = parseInt(rawRecord.shape_pt_sequence, 10);

      // Basic validation for parsed numbers
      if (isNaN(shapeId) || isNaN(lat) || isNaN(lon) || isNaN(sequence)) {
        console.warn(
          `⚠️ Skipping malformed or incomplete record: ${JSON.stringify(rawRecord)}`
        );
        jsonStream.resume();
        return;
      }

      // 2. Check if we've started a new shape or are on the first record
      if (currentShapeId === null) {
        // This is the very first record being processed
        currentShapeId = shapeId;
      } else if (shapeId !== currentShapeId) {
        // We've encountered a new shape_id, meaning the previous shape is complete.
        // Add the completed previous shape to our batch.
        totalShapesInserted++;
        console.log(
          `Aggregated shape ${currentShapeId} with ${currentShapePoints.length} points.`
        );

        currentBatch.push({
          id: currentShapeId,
          points: currentShapePoints,
        });

        // If the batch is full, insert it into the database
        if (currentBatch.length >= BATCH_SIZE) {
          batchCounter++;
          console.log(
            `Processing batch ${batchCounter}: Inserting/Updating ${currentBatch.length} shapes. Total shapes inserted: ${totalShapesInserted}`
          );
          await db
            .insert(shapes)
            .values(currentBatch)
            .onConflictDoUpdate({
              target: shapes.id,
              set: {
                points: sql`excluded.points`, // Update 'points' if 'id' conflicts
              },
            });
          currentBatch = []; // Clear the batch after insertion
        }

        // Reset our aggregation variables for the new shape
        currentShapeId = shapeId;
        currentShapePoints = [];
      }

      // 3. Add the current point to the current shape's points array
      currentShapePoints.push({ lat, lon, sequence });
      totalPointsProcessed++;

      jsonStream.resume(); // Resume the stream to get the next record
    });

    jsonStream.on('end', async () => {
      // After all records from the file are processed, we need to
      // insert the very last aggregated shape (if any points were collected).
      if (currentShapeId !== null && currentShapePoints.length > 0) {
        totalShapesInserted++;
        console.log(
          `Aggregated final shape ${currentShapeId} with ${currentShapePoints.length} points.`
        );
        currentBatch.push({
          id: currentShapeId,
          points: currentShapePoints,
        });
      }

      // Insert any remaining shapes in the final batch
      if (currentBatch.length > 0) {
        batchCounter++;
        console.log(
          `Processing final batch ${batchCounter}: Inserting/Updating ${currentBatch.length} shapes. Total shapes inserted: ${totalShapesInserted}`
        );
        await db
          .insert(shapes)
          .values(currentBatch)
          .onConflictDoUpdate({
            target: shapes.id,
            set: {
              points: sql`excluded.points`,
            },
          });
      }

      console.log(
        `✅ Shapes seeding complete! Total individual points processed from file: ${totalPointsProcessed}. Total complete shapes inserted: ${totalShapesInserted}`
      );
      process.exit(0); // Exit successfully
    });

    // Error handling for file stream and JSON parsing
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

seedShapes();
