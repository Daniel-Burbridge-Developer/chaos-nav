import * as fs from "fs";

// Define the structure of an individual bus route object in the input file
interface BusRoute {
  bus_number: string;
  stops: Stop[];
}

// Define the structure of a stop within a bus route
interface Stop {
  segment: number;
  name: string;
  id: string;
}

// Define the structure of the output object
interface BusRouteMap {
  [busNumber: string]: Stop[];
}

// Input and output file names
const inputFileName = "bus_routes_full.json";
const outputFileName = "bus_routes_kv_stops.json";

try {
  // Read the input JSON file
  console.log(`Reading file: ${inputFileName}`);
  const rawData = fs.readFileSync(inputFileName, "utf8");
  const busRoutes: BusRoute[] = JSON.parse(rawData);

  // Count the number of entries (bus routes) read from the original file
  const linesRead = busRoutes.length;
  console.log(
    `Successfully read ${linesRead} bus route entries from the original file.`
  );

  // Convert the array of bus route objects to a KV pair object
  const busRoutesKv: BusRouteMap = {};
  busRoutes.forEach((route) => {
    busRoutesKv[route.bus_number] = route.stops;
  });

  // Get the number of entries converted
  const entriesConverted = Object.keys(busRoutesKv).length;

  // Write the KV pair object to a new JSON file
  fs.writeFileSync(
    outputFileName,
    JSON.stringify(busRoutesKv, null, 2),
    "utf8"
  );

  console.log(
    `Successfully converted ${entriesConverted} bus routes from "${inputFileName}" to "${outputFileName}".`
  );
  console.log(
    `The new file uses "bus_number" as the key and the "stops" array as the value.`
  );
} catch (error) {
  console.error(`Error converting the file: ${error.message}`);
}
