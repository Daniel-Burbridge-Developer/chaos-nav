import { parse } from 'csv-parse';
import * as fs from 'fs';
import * as path from 'path';
import 'dotenv/config'; // Import and configure dotenv at the very top

// Define the interface for the raw CSV row
interface CsvRow {
  location_type: string;
  parent_station: string;
  stop_id: string;
  stop_code: string;
  stop_name: string;
  stop_desc: string;
  stop_lat: string;
  stop_lon: string;
  zone_id: string;
  supported_modes: string;
  iptiscode: string;
}

// Define the interface for your transformed 'Stop' data
interface Stop {
  id: number;
  name: string;
  number: string;
}

/**
 * Parses a CSV file, transforms the data according to the 'Stop' schema,
 * and returns ALL entries.
 * @param filePath The path to the CSV file.
 * @returns A promise that resolves to an array of Stop objects.
 */
async function parseAndTransformAllStopsCsv(filePath: string): Promise<Stop[]> {
  const rawRecords: CsvRow[] = [];

  console.log(`[CSV Parser] Starting to read CSV file from: ${filePath}`);

  return new Promise((resolve, reject) => {
    fs.createReadStream(filePath)
      .pipe(
        parse({
          columns: true, // Treat the first row as column names
          skip_empty_lines: true,
          trim: true, // Trim whitespace from values
        })
      )
      .on('data', (record: CsvRow) => {
        rawRecords.push(record);
        // Optional: Log progress for very large files
        // if (rawRecords.length % 10000 === 0) {
        //   console.log(`[CSV Parser] Processed ${rawRecords.length} records so far...`);
        // }
      })
      .on('end', () => {
        console.log(
          `[CSV Parser] Finished reading CSV. Total raw records: ${rawRecords.length}.`
        );

        console.log('[CSV Parser] Starting data transformation...');
        const transformedStops: Stop[] = rawRecords.map((row) => {
          return {
            id: parseInt(row.stop_id, 10),
            name: row.stop_name,
            number: row.stop_code.toString(),
          };
        });
        console.log(
          `[CSV Parser] Data transformation complete. Total transformed stops: ${transformedStops.length}.`
        );

        resolve(transformedStops); // Resolve with ALL transformed records
      })
      .on('error', (err: Error) => {
        console.error(
          `[CSV Parser Error] Error during CSV parsing: ${err.message}`
        );
        reject(err);
      });
  });
}

// Main execution block
async function main() {
  console.log('[Main] Script started.');

  // Get the current file's URL
  const currentFileUrl = import.meta.url;
  // Convert the URL to a file path
  const currentFilePath = new URL(currentFileUrl).pathname;
  // Get the directory name from the file path
  const currentDirPath = path.dirname(currentFilePath);

  console.log(`[Main] Current script directory: ${currentDirPath}`);

  // Use currentDirPath for constructing file paths
  const csvFilePath = path.join(currentDirPath, '../transperth_data/stops.csv');
  const outputJsonFilePath = path.join(
    currentDirPath,
    '../transperth_data/stops.json'
  );

  console.log(`[Main] CSV input path: ${csvFilePath}`);
  console.log(`[Main] JSON output path: ${outputJsonFilePath}`);

  try {
    // Check if the CSV file exists
    if (!fs.existsSync(csvFilePath)) {
      console.error(`[Error] CSV file not found at: ${csvFilePath}`);
      process.exit(1); // Exit if the CSV file doesn't exist
    }

    // Call the function to get ALL records
    const allStops = await parseAndTransformAllStopsCsv(csvFilePath);
    console.log(`\n--- Script Process Summary ---`);
    console.log(
      `Successfully transformed ${allStops.length} entries from CSV.`
    );

    // Write the transformed data to a JSON file
    console.log(
      `\n[JSON Writer] Attempting to write data to ${outputJsonFilePath}...`
    );
    fs.writeFileSync(
      outputJsonFilePath,
      JSON.stringify(allStops, null, 2), // Pretty-print JSON with 2-space indentation
      'utf8'
    );
    console.log(`[JSON Writer] Data successfully written to JSON file!`);
    console.log(`[Main] Script finished successfully.`);
  } catch (error: any) {
    // Use 'any' for error type to safely access properties like message
    console.error(
      `\n[Main Error] Script failed to process CSV file or write JSON file.`
    );
    console.error(`Error details: ${error.message || error}`);
    // Optional: Log stack trace for detailed debugging
    // console.error(error.stack);
    process.exit(1); // Exit with a non-zero code to indicate failure
  }
}

main();
