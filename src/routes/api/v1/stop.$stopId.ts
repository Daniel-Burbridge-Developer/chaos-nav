// src/routes/api/stop-by-id.$stopId.ts

import { db } from '~/db/db'; // Your Drizzle DB instance
import { schema } from '~/db/schema/index'; // Assuming 'stops' schema is exported from here
import { eq } from 'drizzle-orm'; // Import 'eq' for exact matching
import { json } from '@tanstack/react-start';
import { createAPIFileRoute } from '@tanstack/react-start/api';

import { z } from 'zod'; // For input validation

// --- Schema Definitions (Copied from your provided schema) ---

export type Stop = typeof schema.stops.$inferSelect; // Infer the Stop type from your Drizzle schema

// --- Configuration ---

// Define a Zod schema for input validation for the stopId parameter.
// The stopId is expected to be a string that can be transformed into a number,
// as the 'id' column in the 'stops' table is an integer.
const stopIdSchema = z.object({
  stopId: z
    .string()
    .min(1, 'Stop ID cannot be empty.')
    .transform((val) => parseInt(val, 10))
    .refine((val) => !isNaN(val), {
      message: 'Stop ID must be a valid number.',
    }),
});

// Define allowed origins for CORS.
// IMPORTANT: For production, list specific domains that need access.
const ALLOWED_ORIGINS = [
  'http://localhost:5173',
  'http://localhost:3000',
  'https://chaos-nav.unstablevault.dev/',
  // Add any other production domains here
];

// In-memory cache for single stop results.
// Key: stop ID (string), Value: { data: Stop | null, timestamp: number }
const stopByIdCache = new Map<
  string,
  { data: Stop | null; timestamp: number }
>();

// Cache Time To Live (TTL) in milliseconds (e.g., 50 minutes = 3000000ms).
// Adjust this based on how often your stop data changes and how fresh you need it to be.
const CACHE_TTL_MS = 50 * 60 * 1000; // 50 minutes cache TTL

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
 * Defines an API route for fetching a single stop by its ID.
 * This uses `createAPIFileRoute` for structured API definition in Tanstack Start.
 * The route path is `/api/stop-by-id/:stopId`.
 *
 * The `GET` function handles GET requests and includes in-memory caching for the stop result.
 */
export const APIRoute = createAPIFileRoute('/api/v1/stop/$stopId')({
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
    return handleUnauthorizedAccess(origin, 'Stop By ID API - OPTIONS');
  },

  // The 'GET' function handles GET requests to this API route
  GET: async ({ params, request }) => {
    const origin = request.headers.get('Origin');
    // Check if the origin is allowed for GET requests
    if (origin && !ALLOWED_ORIGINS.includes(origin)) {
      return handleUnauthorizedAccess(origin, 'Stop By ID API - GET');
    }

    try {
      // Extract stopId from URL parameters
      const { stopId } = params;

      // Validate the stopId parameter using Zod
      const validationResult = stopIdSchema.safeParse({ stopId });

      if (!validationResult.success) {
        // Return a 400 Bad Request if validation fails
        console.warn(
          `[Stop By ID API] Invalid stop ID parameter: "${stopId}". Details:`,
          validationResult.error.flatten().fieldErrors
        );
        return json(
          {
            error: 'Invalid stop ID.',
            details: validationResult.error.flatten().fieldErrors,
          },
          { status: 400 }
        );
      }

      const searchStopId = validationResult.data.stopId; // This is now a number
      const cacheKey = String(searchStopId); // Use string representation for cache key consistency

      // 1. Check in-memory cache first for a valid, non-expired entry
      const cachedEntry = stopByIdCache.get(cacheKey);
      if (cachedEntry && Date.now() - cachedEntry.timestamp < CACHE_TTL_MS) {
        console.log(
          `[Stop By ID API] Serving from in-memory cache for stop ID: "${cacheKey}".`
        );
        // Ensure the data from cache is returned with the correct type
        return json(cachedEntry.data, {
          status: 200,
          headers: getCorsHeaders(origin),
        });
      }

      // 2. If not in cache or expired, fetch data from the database
      console.log(
        `[Stop By ID API] Fetching from DB for stop ID: "${cacheKey}".`
      );

      // Drizzle query for exact match on 'id' and selecting a single stop
      const stopResult: Stop[] = await db
        .select() // Select all columns for the Stop type
        .from(schema.stops)
        .where(eq(schema.stops.id, searchStopId)) // Exact match on 'id'
        .limit(1); // Expecting only one stop for a given ID

      const foundStop: Stop | null =
        stopResult.length > 0 ? stopResult[0] : null;

      // 3. Store the fresh data in the in-memory cache
      stopByIdCache.set(cacheKey, {
        data: foundStop, // Storing a single Stop object or null
        timestamp: Date.now(),
      });

      console.log(
        `[Stop By ID API] DB query completed. Stop found: ${foundStop ? 'Yes' : 'No'} for stop ID: "${searchStopId}". Data cached.`
      );
      // Return the found stop (or null) as a JSON response
      return json(foundStop, { status: 200, headers: getCorsHeaders(origin) });
    } catch (error) {
      // Catch any unexpected errors during processing and return a 500 error
      return handleServerError(error, 'Stop By ID API - GET');
    }
  },
});
