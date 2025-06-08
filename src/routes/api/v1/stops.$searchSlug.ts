// src/routes/api/stops-search.$query.ts

import { db } from '~/db/db'; // Your Drizzle DB instance
import { schema } from '~/db/schema/index'; // Assuming 'stops' schema is exported from here
import { ilike, or, sql } from 'drizzle-orm'; // Import 'ilike', 'or', and 'sql' for fuzzy search
import { json } from '@tanstack/react-start';
import { createAPIFileRoute } from '@tanstack/react-start/api';

import { z } from 'zod'; // For input validation

// --- Schema Definitions (Copied from your provided schema) ---

export type Stop = typeof schema.stops.$inferSelect; // Infer the Stop type from your Drizzle schema

// --- Configuration ---

// Define a Zod schema for input validation for the search query parameter.
// The query is expected to be a non-empty string.
const searchQuerySchema = z.object({
  searchSlug: z.string().min(1, 'Search query cannot be empty.'),
});

// Define allowed origins for CORS.
// IMPORTANT: For production, list specific domains that need access.
const ALLOWED_ORIGINS = [
  'http://localhost:5173',
  'http://localhost:3000',
  'https://chaos-nav.unstablevault.dev/',
  // Add any other production domains here
];

// In-memory cache for stop fuzzy search results.
// Key: search query (lowercase), Value: { data: Stop[], timestamp: number }
const stopsSearchCache = new Map<string, { data: Stop[]; timestamp: number }>();

// Cache Time To Live (TTL) in milliseconds (e.g., 50 minutes = 3000000ms).
// Adjust this based on how often your stop data changes and how fresh you need it to be.
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
 * Defines an API route for fuzzy searching stops by stop number (ID) or stop name.
 * This uses `createAPIFileRoute` for structured API definition in Tanstack Start.
 * The route path is `/api/stops-search/:query`.
 *
 * The `GET` function handles GET requests and includes in-memory caching for the search results.
 */
export const APIRoute = createAPIFileRoute('/api/v1/stops/$searchSlug')({
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
    return handleUnauthorizedAccess(origin, 'Stop Search API - OPTIONS');
  },

  // The 'GET' function handles GET requests to this API route
  GET: async ({ params, request }) => {
    const origin = request.headers.get('Origin');
    // Check if the origin is allowed for GET requests
    if (origin && !ALLOWED_ORIGINS.includes(origin)) {
      return handleUnauthorizedAccess(origin, 'Stop Search API - GET');
    }

    try {
      // Extract query from URL parameters
      const { searchSlug } = params;

      // Validate the query parameter using Zod
      const validationResult = searchQuerySchema.safeParse({ searchSlug });

      if (!validationResult.success) {
        // Return a 400 Bad Request if validation fails
        console.warn(
          `[Stop Search API] Invalid search query parameter: "${searchSlug}". Details:`,
          validationResult.error.flatten().fieldErrors
        );
        return json(
          {
            error: 'Invalid search query.',
            details: validationResult.error.flatten().fieldErrors,
          },
          { status: 400 }
        );
      }

      const searchQuery = validationResult.data.searchSlug;
      const cacheKey = searchQuery.toLowerCase(); // Use lowercase query as cache key for consistency

      // 1. Check in-memory cache first for a valid, non-expired entry
      const cachedEntry = stopsSearchCache.get(cacheKey);
      if (cachedEntry && Date.now() - cachedEntry.timestamp < CACHE_TTL_MS) {
        console.log(
          `[Stop Search API] Serving from in-memory cache for query: "${cacheKey}".`
        );
        // Ensure the data from cache is returned with the correct type
        return json(cachedEntry.data, {
          status: 200,
          headers: getCorsHeaders(origin),
        });
      }

      // 2. If not in cache or expired, fetch data from the database
      console.log(
        `[Stop Search API] Fetching from DB for query: "${cacheKey}".`
      );

      // Drizzle query for fuzzy match on 'name' or 'id' (converted to text)
      const stopsResult: Stop[] = await db
        .select() // Select all columns for the Stop type
        .from(schema.stops)
        .where(
          or(
            ilike(schema.stops.name, `%${searchQuery}%`), // Fuzzy search by stop name
            // Convert integer 'id' to text for ilike comparison
            ilike(sql`${schema.stops.id}::text`, `%${searchQuery}%`) // Fuzzy search by stop ID
          )
        )
        .limit(5); // Limit the number of results to 5

      // 3. Store the fresh data in the in-memory cache
      stopsSearchCache.set(cacheKey, {
        data: stopsResult, // Storing Stop[] objects
        timestamp: Date.now(),
      });

      console.log(
        `[Stop Search API] DB query completed. Found ${stopsResult.length} stops for query: "${searchQuery}". Data cached.`
      );
      // Return the found stops as a JSON response
      return json(stopsResult, {
        status: 200,
        headers: getCorsHeaders(origin),
      });
    } catch (error) {
      // Catch any unexpected errors during processing and return a 500 error
      return handleServerError(error, 'Stop Search API - GET');
    }
  },
});
