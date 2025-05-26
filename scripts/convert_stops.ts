import * as fs from "fs";

// Define the structure of an individual stop object in the input file
interface Stop {
  id: number;
  name: string;
  number: string;
}

// Define the structure of the output KV pair object
interface KVMap {
  [key: string]: string;
}

// Input and output file names
const inputFileName = "stops.json";
const outputFileName = "stops_kv_pairs.json";

try {
  // Read the input JSON file
  console.log(`Reading file: ${inputFileName}`);
  const rawData = fs.readFileSync(inputFileName, "utf8");
  const stops: Stop[] = JSON.parse(rawData);

  // Count the number of lines read from the original file (approximation for JSON array)
  // This counts the number of objects in the top-level array.
  const linesRead = stops.length;
  console.log(`Successfully read ${linesRead} entries from the original file.`);

  // Convert the array of stop objects to a KV pair object
  const kvPairs: KVMap = {};
  stops.forEach((stop) => {
    kvPairs[stop.number] = stop.name;
  });

  // Get the number of entries converted
  const entriesConverted = Object.keys(kvPairs).length;

  // Write the KV pair object to a new JSON file
  fs.writeFileSync(outputFileName, JSON.stringify(kvPairs, null, 2), "utf8");

  console.log(
    `Successfully converted ${entriesConverted} entries from "${inputFileName}" to "${outputFileName}".`
  );
  console.log(`The new file uses "number" as the key and "name" as the value.`);
} catch (error) {
  console.error(`Error converting the file: ${error.message}`);
}
