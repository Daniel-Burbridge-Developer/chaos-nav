import { db } from '~/db/db'; // Your Drizzle DB instance
import { schema } from '~/db/schema/index'; // Updated: Assuming 'routes' schema is exported from here
import { ilike, or } from 'drizzle-orm';
import { json } from '@tanstack/react-start';
import { createAPIFileRoute } from '@tanstack/react-start/api';

import { z } from 'zod'; // For input validation

// --- Configuration ---

// Define a Zod schema for input validation for the busNumber parameter
// The bus number is expected to be a string and not empty.
const busNumberSchema = z.object({
  busNumber: z.string().min(1, 'Bus number cannot be empty.'),
});

// Define allowed origins for CORS.
// IMPORTANT: For production, list specific domains that need access.
const ALLOWED_ORIGINS = [
  'http://localhost:5173',
  'http://localhost:3000',
  'https://chaos-nav.unstablevault.dev/',
  // Add any other production domains here
];

// Define the structure of a single route result object
interface RouteResult {
  id: string;
  name: string | null; // Can be short_name or long_name, or null if neither exists
}

// In-memory cache for route search results.
// Key: bus number (lowercase), Value: { data: RouteResult[], timestamp: number }
// Corrected the type of 'data' from 'string[]' to 'RouteResult[]'
const routeCache = new Map<
  string,
  { data: RouteResult[]; timestamp: number }
>();

// Cache Time To Live (TTL) in milliseconds (e.g., 50 minutes = 3000000ms).
// Adjust this based on how often your route data changes and how fresh you need it to be.
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
 * Defines an API route for searching routes by bus number (short_name or long_name).
 * This uses `createAPIFileRoute` for structured API definition in Tanstack Start.
 * The route path is `/api/route/:busNumber`.
 *
 * The `GET` function handles GET requests and includes in-memory caching for search results.
 */
export const APIRoute = createAPIFileRoute('/api/v1/routes/$busNumber')({
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
    return handleUnauthorizedAccess(origin, 'Routes API - OPTIONS');
  },

  // The 'GET' function handles GET requests to this API route
  GET: async ({ params, request }) => {
    const origin = request.headers.get('Origin');
    // Check if the origin is allowed for GET requests
    if (origin && !ALLOWED_ORIGINS.includes(origin)) {
      return handleUnauthorizedAccess(origin, 'Routes API - GET');
    }

    try {
      // Extract busNumber from URL parameters
      const { busNumber } = params;

      // Validate the busNumber parameter using Zod
      const validationResult = busNumberSchema.safeParse({ busNumber });

      if (!validationResult.success) {
        // Return a 400 Bad Request if validation fails
        console.warn(
          `[Routes API] Invalid bus number parameter: "${busNumber}". Details:`,
          validationResult.error.flatten().fieldErrors
        );
        return json(
          {
            error: 'Invalid bus number.',
            details: validationResult.error.flatten().fieldErrors,
          },
          { status: 400 }
        );
      }

      const searchBusNumber = validationResult.data.busNumber;
      const cacheKey = searchBusNumber.toLowerCase(); // Use lowercase bus number as cache key for consistency

      // 1. Check in-memory cache first for a valid, non-expired entry
      const cachedEntry = routeCache.get(cacheKey);
      if (cachedEntry && Date.now() - cachedEntry.timestamp < CACHE_TTL_MS) {
        console.log(
          `[Routes API] Serving from in-memory cache for bus number: "${cacheKey}".`
        );
        // Ensure the data from cache is returned with the correct type
        return json(cachedEntry.data, {
          status: 200,
          headers: getCorsHeaders(origin),
        });
      }

      // 2. If not in cache or expired, fetch data from the database
      console.log(
        `[Routes API] Fetching from DB for bus number: "${cacheKey}".`
      );
      const matchingRoutes = await db
        .select({
          id: schema.routes.id,
          short_name: schema.routes.short_name,
          long_name: schema.routes.long_name,
        })
        .from(schema.routes)
        .where(
          or(
            ilike(schema.routes.short_name, `%${searchBusNumber}%`),
            ilike(schema.routes.long_name, `%${searchBusNumber}%`)
          )
        )
        .limit(5);

      // Map the results to the desired { id, name } object structure
      const results: RouteResult[] = matchingRoutes.map((route) => ({
        id: route.id,
        name: route.short_name || route.long_name || null, // Prioritize short_name, otherwise use long_name
      }));

      // 3. Store the fresh data in the in-memory cache
      routeCache.set(cacheKey, {
        data: results, // Storing RouteResult[] objects now
        timestamp: Date.now(),
      });

      console.log(
        `[Routes API] DB query completed. Found ${results.length} entries for bus number: "${searchBusNumber}". Data cached.`
      );
      // Return the found route IDs and names as a JSON response
      return json(results, { status: 200, headers: getCorsHeaders(origin) });
    } catch (error) {
      // Catch any unexpected errors during processing and return a 500 error
      return handleServerError(error, 'Routes API - GET');
    }
  },
});
