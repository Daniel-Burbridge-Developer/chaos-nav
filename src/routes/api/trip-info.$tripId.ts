// src/routes/api/trip-info.$tripId.ts
import { json } from '@tanstack/react-start';
import { createAPIFileRoute } from '@tanstack/react-start/api';
import * as fs from 'fs/promises'; // Use fs/promises for async file operations
import * as path from 'path'; // To resolve file paths

// Define the type for a single stop_time entry from your JSON
interface StopTimeEntry {
  trip_id: string;
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

// Define allowed origins for CORS (adjust as needed for your deployment)
const ALLOWED_ORIGINS = [
  'http://localhost:5173',
  'http://localhost:3000',
  'https://chaos-nav.unstablevault.dev/',
  // Add any other production domains here
];

// In-memory cache for stop_times data
const stopTimesCache = new Map<
  string,
  { data: StopTimeEntry[]; timestamp: number }
>();

// Cache Time To Live (TTL) in milliseconds (e.g., 5 minutes = 300000ms)
const CACHE_TTL_MS = 50 * 60 * 1000; // 50 minutes cache TTL for the entire dataset

// Path to your JSON file
// Using path.resolve to ensure the path is absolute regardless of where the script is run
const JSON_FILE_PATH = path.resolve(
  process.cwd(),
  'src/transperth_data/stop_times.json'
);

/**
 * Loads the stop_times data from the JSON file.
 * This function will be called once to load the entire dataset into memory for caching.
 * For extremely large JSON files, you might consider a streaming approach or a real database.
 */
async function loadStopTimesData(): Promise<StopTimeEntry[]> {
  try {
    const fileContent = await fs.readFile(JSON_FILE_PATH, 'utf8');
    return JSON.parse(fileContent);
  } catch (error) {
    console.error(
      `[StopTimes API] Error loading JSON file from ${JSON_FILE_PATH}:`,
      error
    );
    // Depending on your error handling strategy, you might want to exit or throw
    throw new Error('Failed to load stop_times data.');
  }
}

// This defines your new API route at /api/trip-info/:tripId
export const APIRoute = createAPIFileRoute('/api/trip-info/$tripId')({
  // Handle OPTIONS requests for CORS preflight
  OPTIONS: async ({ request }) => {
    const origin = request.headers.get('Origin');
    if (origin && ALLOWED_ORIGINS.includes(origin)) {
      return new Response(null, {
        status: 204, // No Content
        headers: {
          'Access-Control-Allow-Origin': '*', // Allows all origins as per your template, but consider being more restrictive
          'Access-Control-Allow-Methods': 'GET,OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
          'Access-Control-Max-Age': '86400', // Cache preflight for 24 hours
        },
      });
    }
    return new Response(null, { status: 403 }); // Forbidden if origin not allowed
  },

  // Handle GET requests to fetch trip data
  GET: async ({ params, request }) => {
    const origin = request.headers.get('Origin');
    // Allow if origin is missing (same-origin) or in allowed list
    if (origin && !ALLOWED_ORIGINS.includes(origin)) {
      console.warn(
        `[StopTimes API] Unauthorized access attempt from Origin: "${origin}"`
      );
      return json({ error: 'Unauthorized access' }, { status: 403 });
    }

    const { tripId } = params; // Extract tripId from the URL parameters
    const cacheKey = 'all_stop_times'; // We'll cache the entire dataset for simplicity

    // 1. Basic validation for the trip_id
    if (!tripId || typeof tripId !== 'string' || tripId.trim() === '') {
      console.warn(
        `[StopTimes API] Invalid or missing tripId: "${tripId}". Returning empty array.`
      );
      return json({ data: [] }, { status: 400 }); // Bad Request
    }

    // 2. Check cache for the entire dataset first
    let allStopTimes: StopTimeEntry[] = [];
    const cachedEntry = stopTimesCache.get(cacheKey);

    if (cachedEntry && Date.now() - cachedEntry.timestamp < CACHE_TTL_MS) {
      console.log(`[StopTimes API] Serving all data from cache.`);
      allStopTimes = cachedEntry.data;
    } else {
      // 3. If not in cache or expired, load from JSON file
      console.log(
        `[StopTimes API] Loading data from JSON file: ${JSON_FILE_PATH}`
      );
      try {
        allStopTimes = await loadStopTimesData();
        // Store fresh data in cache
        stopTimesCache.set(cacheKey, {
          data: allStopTimes,
          timestamp: Date.now(),
        });
        console.log(`[StopTimes API] JSON data loaded and cached.`);
      } catch (err: any) {
        console.error(`[StopTimes API] Error loading JSON data:`, err);
        return json(
          {
            error:
              'Failed to load stop_times data: ' +
              (err.message || 'Unknown file error'),
          },
          { status: 500 } // Internal Server Error
        );
      }
    }

    // 4. Filter the loaded data by trip_id
    const filteredResults = allStopTimes.filter(
      (entry) => entry.trip_id === tripId
    );

    console.log(
      `[StopTimes API] Found ${filteredResults.length} entries for trip_id: "${tripId}".`
    );

    return json({ data: filteredResults }); // Return the filtered data
  },
});
