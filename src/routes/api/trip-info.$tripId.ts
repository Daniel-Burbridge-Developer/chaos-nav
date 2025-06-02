// src/routes/api/trip-info.$tripId.ts
import { json } from '@tanstack/react-start';
import { createAPIFileRoute } from '@tanstack/react-start/api';
import { db } from '~/db/db'; // Your Drizzle DB instance
import { eq } from 'drizzle-orm'; // Import 'eq' for comparisons

// Define the type for a single stop_time entry as it comes from your Drizzle query.
interface StopTimeEntry {
  id: number;
  tripId: string;
  arrivalTime: string;
  departureTime: string;
  stopId: string;
  stopSequence: number;
  pickupType: number | null;
  dropOffType: number | null;
  timepoint: number | null;
  fare: number | null;
  zone: number | null;
  section: number | null;
}

// Define allowed origins for CORS (adjust as needed for your deployment)
const ALLOWED_ORIGINS = [
  'http://localhost:5173',
  'http://localhost:3000',
  'https://chaos-nav.unstablevault.dev/',
  // Add any other production domains here
];

// In-memory cache for stop_times data by tripId
// Key: tripId (string)
// Value: { data: StopTimeEntry[], timestamp: number }
const stopTimesByTripIdCache = new Map<
  string,
  { data: StopTimeEntry[]; timestamp: number }
>();

// Cache Time To Live (TTL) in milliseconds (e.g., 5 minutes = 300000ms)
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes cache TTL for individual trip data

// This defines your new API route at /api/trip-info/:tripId
export const APIRoute = createAPIFileRoute('/api/trip-info/$tripId')({
  // Handle OPTIONS requests for CORS preflight
  OPTIONS: async ({ request }) => {
    const origin = request.headers.get('Origin');
    if (origin && ALLOWED_ORIGINS.includes(origin)) {
      return new Response(null, {
        status: 204, // No Content
        headers: {
          'Access-Control-Allow-Origin': origin, // Be specific with origin in production
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
    const cacheKey = tripId; // The tripId is our cache key

    // 1. Basic validation for the trip_id
    if (!tripId || typeof tripId !== 'string' || tripId.trim() === '') {
      console.warn(
        `[StopTimes API] Invalid or missing tripId: "${tripId}". Returning empty array.`
      );
      return json({ data: [] }, { status: 400 }); // Bad Request
    }

    // 2. Check cache first for this specific tripId
    const cachedEntry = stopTimesByTripIdCache.get(cacheKey);
    if (cachedEntry && Date.now() - cachedEntry.timestamp < CACHE_TTL_MS) {
      console.log(
        `[StopTimes API] Serving from cache for tripId: "${cacheKey}".`
      );
      return json({ data: cachedEntry.data });
    }

    // 3. If not in cache or expired, fetch from DB
    console.log(`[StopTimes API] Fetching from DB for tripId: "${tripId}".`);
    try {
      const filteredResults: StopTimeEntry[] = await db
        .select()
        .from(stopTimes)
        .where(eq(stopTimes.tripId, tripId));

      console.log(
        `[StopTimes API] Found ${filteredResults.length} entries for trip_id: "${tripId}".`
      );

      // 4. Store fresh data in cache before returning
      stopTimesByTripIdCache.set(cacheKey, {
        data: filteredResults,
        timestamp: Date.now(),
      });

      return json({ data: filteredResults }); // Return the filtered data
    } catch (err: any) {
      console.error(
        `[StopTimes API] Error fetching stop times for "${tripId}" from DB:`,
        err
      );
      return json(
        {
          error:
            'Failed to fetch stop_times data due to server error: ' +
            (err.message || 'Unknown DB Error'),
        },
        { status: 500 } // Internal Server Error
      );
    }
  },
});
