import * as fs from 'fs';
import * as readline from 'readline';

/**
 * Creates an asynchronous generator that reads a file line by line using Node.js streams.
 * This is crucial for streaming large files without loading them entirely into memory.
 *
 * @param filePath The path to the file to read.
 * @returns An AsyncGenerator that yields each line of the file as a string.
 */
async function* createLineReader(filePath: string): AsyncGenerator<string> {
  // Create a readable stream from the file
  const fileStream = fs.createReadStream(filePath, { encoding: 'utf8' });

  // Create a readline interface to read lines from the stream
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity, // Handle Windows line endings (\r\n) correctly
  });

  try {
    for await (const line of rl) {
      if (line.trim()) {
        // Yield non-empty lines
        yield line.trim();
      }
    }
  } catch (error) {
    console.error(`Error reading file stream from ${filePath}:`, error);
    throw new Error(
      `Failed to read input file: ${error instanceof Error ? error.message : String(error)}`
    );
  } finally {
    // Close the readline interface and file stream
    rl.close();
    fileStream.close();
  }
}

/**
 * Converts a CSV stream (represented by an AsyncGenerator yielding lines)
 * into a JSON array of objects. Each row becomes an object, and the header row
 * defines the keys. This function processes data in a streaming manner.
 *
 * @param csvLineGenerator An AsyncGenerator that yields lines of CSV data.
 * @param delimiter The character used to separate values in the CSV (default is ',').
 * @returns A Promise that resolves to a JSON array of objects.
 */
async function csvToJson(
  csvLineGenerator: AsyncGenerator<string>,
  delimiter: string = ','
): Promise<any[]> {
  const result: any[] = [];
  let headers: string[] = [];
  let isFirstLine = true;

  try {
    for await (const line of csvLineGenerator) {
      if (!line.trim()) {
        continue; // Skip empty lines
      }

      // Split values, handling potential quoted fields if necessary (basic split for now)
      // For more robust CSV parsing with quotes and escaped delimiters, a dedicated CSV parsing library
      // would be recommended (e.g., 'csv-parse' for Node.js).
      const values = line.split(delimiter).map((value) => value.trim());

      if (isFirstLine) {
        headers = values;
        isFirstLine = false;
      } else {
        const rowObject: { [key: string]: any } = {};
        for (let j = 0; j < headers.length; j++) {
          // Assign value to its corresponding header, handling cases where a row might have fewer values than headers
          rowObject[headers[j]] = values[j] !== undefined ? values[j] : null;
        }
        result.push(rowObject);
      }
    }
  } catch (error) {
    console.error('Error during CSV to JSON conversion:', error);
    throw new Error(
      `Conversion failed: ${error instanceof Error ? error.message : String(error)}`
    );
  }

  return result;
}

/**
 * Main function to run the CSV to JSON conversion from the command line.
 * It expects input and output file paths as arguments.
 */
async function main() {
  // Process command-line arguments: node dist/script.js <inputFile> <outputFile> [delimiter]
  const args = process.argv.slice(2); // Skip 'node' and 'script.js'

  if (args.length < 2) {
    console.log(
      'Usage: ts-node your-script.ts <input-csv-file> <output-json-file> [delimiter]'
    );
    console.log('Example: ts-node your-script.ts input.csv output.json;');
    process.exit(1);
  }

  const inputFilePath = args[0];
  const outputFilePath = args[1];
  const delimiter = args[2] || ','; // Default delimiter is comma

  console.log(
    `Converting '${inputFilePath}' to '${outputFilePath}' using delimiter '${delimiter}'...`
  );

  try {
    // Check if input file exists
    if (!fs.existsSync(inputFilePath)) {
      throw new Error(`Input file not found: ${inputFilePath}`);
    }

    const lineReader = createLineReader(inputFilePath);
    const jsonOutput = await csvToJson(lineReader, delimiter);

    if (jsonOutput.length === 0) {
      console.warn(
        'Warning: The input CSV file appears to be empty or contains only headers.'
      );
    }

    const jsonString = JSON.stringify(jsonOutput, null, 2);

    // Write the JSON output to the specified file
    fs.writeFileSync(outputFilePath, jsonString, 'utf8');

    console.log(`Conversion complete! JSON saved to '${outputFilePath}'.`);
  } catch (error) {
    console.error(
      `Error: ${error instanceof Error ? error.message : String(error)}`
    );
    process.exit(1);
  }
}

// Call the main function to start the process
main();
