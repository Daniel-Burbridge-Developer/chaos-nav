// src/routes/api/trip-by-id.$tripId.ts

import { db } from '~/db/db'; // Your Drizzle DB instance
import { schema } from '~/db/schema/index'; // Assuming 'trips' schema is exported from here
import { eq } from 'drizzle-orm'; // Import 'eq' for exact matching
import { json } from '@tanstack/react-start';
import { createAPIFileRoute } from '@tanstack/react-start/api';

import { z } from 'zod'; // For input validation

// --- Schema Definitions (Copied from your provided schema) ---

export type TripStop = {
  id: string; // Corresponds to stop_id in original RawStopTimeJson
  arrivalTime: string; // Corresponds to arrival_time in original RawStopTimeJson
  stopSequence: number; // Corresponds to stop_sequence in original RawStopTimeJson
};

export type Trip = typeof schema.trips.$inferSelect; // Infer the Trip type from your Drizzle schema

// --- Configuration ---

// Define a Zod schema for input validation for the tripId parameter.
// The tripId is expected to be a non-empty string, as it's the primary key of the trips table.
const tripIdSchema = z.object({
  tripId: z.string().min(1, 'Trip ID cannot be empty.'),
});

// Define allowed origins for CORS.
// IMPORTANT: For production, list specific domains that need access.
const ALLOWED_ORIGINS = [
  'http://localhost:5173',
  'http://localhost:3000',
  'https://chaos-nav.unstablevault.dev/',
  // Add any other production domains here
];

// In-memory cache for single trip results.
// Key: trip ID (string), Value: { data: Trip | null, timestamp: number }
const tripByIdCache = new Map<
  string,
  { data: Trip | null; timestamp: number }
>();

// Cache Time To Live (TTL) in milliseconds (e.g., 50 minutes = 3000000ms).
// Adjust this based on how often your trip data changes and how fresh you need it to be.
const CACHE_TTL_MS = 500 * 60 * 1000; // 500 minutes cache TTL

// --- Helper Functions ---

/**
 * Generates CORS headers for a given origin.
 * Sets 'Access-Control-Allow-Origin' to the specific origin if provided,
 * otherwise it implies a same-origin request which doesn't require this header for the browser.
 * @param origin The origin from the request header.
 * @returns Headers object with CORS settings.
 */
function getCorsHeaders(origin: string | null): Headers {
  const headers = new Headers();
  if (origin) {
    // Set the specific origin if it's provided and allowed (checked before calling this function)
    headers.set('Access-Control-Allow-Origin', origin);
  }
  headers.set('Access-Control-Allow-Methods', 'GET,OPTIONS');
  headers.set('Access-Control-Allow-Headers', 'Content-Type');
  headers.set('Access-Control-Max-Age', '86400'); // Cache preflight for 24 hours
  return headers;
}

/**
 * Handles unauthorized access attempts by logging and returning a 403 Forbidden response.
 * @param origin The origin that attempted access.
 * @param apiName The name of the API for logging purposes.
 * @returns A JSON response with a 403 status.
 */
function handleUnauthorizedAccess(origin: string | null, apiName: string) {
  console.warn(
    `[${apiName}] Unauthorized access attempt from Origin: "${origin}"`
  );
  return json({ error: 'Unauthorized access' }, { status: 403 });
}

/**
 * Handles internal server errors by logging and returning a 500 Internal Server Error response.
 * @param error The error object.
 * @param apiName The name of the API for logging purposes.
 * @returns A JSON response with a 500 status.
 */
function handleServerError(error: unknown, apiName: string) {
  console.error(`[${apiName}] An unexpected server error occurred:`, error);
  return json({ error: 'An internal server error occurred.' }, { status: 500 });
}

// --- API Route Definition ---

/**
 * Defines an API route for fetching a single trip by its ID.
 * This uses `createAPIFileRoute` for structured API definition in Tanstack Start.
 * The route path is `/api/trip-by-id/:tripId`.
 *
 * The `GET` function handles GET requests and includes in-memory caching for the trip result.
 */
export const APIRoute = createAPIFileRoute('/api/v1/trip/$tripId')({
  // Handle OPTIONS requests for CORS preflight
  OPTIONS: async ({ request }) => {
    const origin = request.headers.get('Origin');
    if (origin && ALLOWED_ORIGINS.includes(origin)) {
      // Return a 204 No Content response with CORS headers
      return new Response(null, {
        status: 204,
        headers: getCorsHeaders(origin),
      });
    }
    // If origin is not allowed, return 403 Forbidden
    return handleUnauthorizedAccess(origin, 'Trip By ID API - OPTIONS');
  },

  // The 'GET' function handles GET requests to this API route
  GET: async ({ params, request }) => {
    const origin = request.headers.get('Origin');
    // Check if the origin is allowed for GET requests
    if (origin && !ALLOWED_ORIGINS.includes(origin)) {
      return handleUnauthorizedAccess(origin, 'Trip By ID API - GET');
    }

    try {
      // Extract tripId from URL parameters
      const { tripId } = params;

      // Validate the tripId parameter using Zod
      const validationResult = tripIdSchema.safeParse({ tripId });

      if (!validationResult.success) {
        // Return a 400 Bad Request if validation fails
        console.warn(
          `[Trip By ID API] Invalid trip ID parameter: "${tripId}". Details:`,
          validationResult.error.flatten().fieldErrors
        );
        return json(
          {
            error: 'Invalid trip ID.',
            details: validationResult.error.flatten().fieldErrors,
          },
          { status: 400 }
        );
      }

      const searchTripId = validationResult.data.tripId;
      const cacheKey = searchTripId; // Use trip ID directly as cache key

      // 1. Check in-memory cache first for a valid, non-expired entry
      const cachedEntry = tripByIdCache.get(cacheKey);
      if (cachedEntry && Date.now() - cachedEntry.timestamp < CACHE_TTL_MS) {
        console.log(
          `[Trip By ID API] Serving from in-memory cache for trip ID: "${cacheKey}".`
        );
        // Ensure the data from cache is returned with the correct type
        return json(cachedEntry.data, {
          status: 200,
          headers: getCorsHeaders(origin),
        });
      }

      // 2. If not in cache or expired, fetch data from the database
      console.log(
        `[Trip By ID API] Fetching from DB for trip ID: "${cacheKey}".`
      );

      // Drizzle query for exact match on 'id' and selecting a single trip
      const tripResult: Trip[] = await db
        .select() // Select all columns for the Trip type
        .from(schema.trips)
        .where(eq(schema.trips.id, searchTripId)) // Exact match on 'id'
        .limit(1); // Expecting only one trip for a given ID

      const foundTrip: Trip | null =
        tripResult.length > 0 ? tripResult[0] : null;

      // 3. Store the fresh data in the in-memory cache
      tripByIdCache.set(cacheKey, {
        data: foundTrip, // Storing a single Trip object or null
        timestamp: Date.now(),
      });

      console.log(
        `[Trip By ID API] DB query completed. Trip found: ${foundTrip ? 'Yes' : 'No'} for trip ID: "${searchTripId}". Data cached.`
      );
      // Return the found trip (or null) as a JSON response
      return json(foundTrip, { status: 200, headers: getCorsHeaders(origin) });
    } catch (error) {
      // Catch any unexpected errors during processing and return a 500 error
      return handleServerError(error, 'Trip By ID API - GET');
    }
  },
});
