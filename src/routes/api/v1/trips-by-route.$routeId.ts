// src/routes/api/trips-by-route.$routeId.ts

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

// Define a Zod schema for input validation for the routeId parameter.
// The routeId is expected to be a non-empty string.
const routeIdSchema = z.object({
  routeId: z.string().min(1, 'Route ID cannot be empty.'),
});

// Define allowed origins for CORS.
// IMPORTANT: For production, list specific domains that need access.
const ALLOWED_ORIGINS = [
  'http://localhost:5173',
  'http://localhost:3000',
  'https://chaos-nav.unstablevault.dev/',
  // Add any other production domains here
];

// In-memory cache for trip search results.
// Key: route ID (string), Value: { data: Trip[], timestamp: number }
const tripCache = new Map<string, { data: Trip[]; timestamp: number }>();

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
 * Defines an API route for fetching trip data by route ID.
 * This uses `createAPIFileRoute` for structured API definition in Tanstack Start.
 * The route path is `/api/trips-by-route/:routeId`.
 *
 * The `GET` function handles GET requests and includes in-memory caching for trip results.
 */
export const APIRoute = createAPIFileRoute('/api/v1/trips-by-route/$routeId')({
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
    return handleUnauthorizedAccess(origin, 'Trip API - OPTIONS');
  },

  // The 'GET' function handles GET requests to this API route
  GET: async ({ params, request }) => {
    const origin = request.headers.get('Origin');
    // Check if the origin is allowed for GET requests
    if (origin && !ALLOWED_ORIGINS.includes(origin)) {
      return handleUnauthorizedAccess(origin, 'Trip API - GET');
    }

    try {
      // Extract routeId from URL parameters
      const { routeId } = params;

      // Validate the routeId parameter using Zod
      const validationResult = routeIdSchema.safeParse({ routeId });

      if (!validationResult.success) {
        // Return a 400 Bad Request if validation fails
        console.warn(
          `[Trip API] Invalid route ID parameter: "${routeId}". Details:`,
          validationResult.error.flatten().fieldErrors
        );
        return json(
          {
            error: 'Invalid route ID.',
            details: validationResult.error.flatten().fieldErrors,
          },
          { status: 400 }
        );
      }

      const searchRouteId = validationResult.data.routeId;
      const cacheKey = searchRouteId.toLowerCase(); // Use lowercase route ID as cache key for consistency

      // 1. Check in-memory cache first for a valid, non-expired entry
      const cachedEntry = tripCache.get(cacheKey);
      if (cachedEntry && Date.now() - cachedEntry.timestamp < CACHE_TTL_MS) {
        console.log(
          `[Trip API] Serving from in-memory cache for route ID: "${cacheKey}".`
        );
        // Ensure the data from cache is returned with the correct type
        return json(cachedEntry.data, {
          status: 200,
          headers: getCorsHeaders(origin),
        });
      }

      // 2. If not in cache or expired, fetch data from the database
      console.log(`[Trip API] Fetching from DB for route ID: "${cacheKey}".`);

      // Drizzle query for exact match on 'route_id' and selecting all trip fields
      const tripsResult: Trip[] = await db
        .select() // Select all columns for the Trip type
        .from(schema.trips)
        .where(eq(schema.trips.route_id, searchRouteId)); // Exact match on 'route_id'

      // 3. Store the fresh data in the in-memory cache
      tripCache.set(cacheKey, {
        data: tripsResult, // Storing Trip[] objects
        timestamp: Date.now(),
      });

      console.log(
        `[Trip API] DB query completed. Found ${tripsResult.length} trips for route ID: "${searchRouteId}". Data cached.`
      );
      // Return the found trips as a JSON response
      return json(tripsResult, {
        status: 200,
        headers: getCorsHeaders(origin),
      });
    } catch (error) {
      // Catch any unexpected errors during processing and return a 500 error
      return handleServerError(error, 'Trip API - GET');
    }
  },
});
