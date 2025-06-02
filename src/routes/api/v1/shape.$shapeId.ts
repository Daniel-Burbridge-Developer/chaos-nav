// src/routes/api/shape-by-id.$shapeId.ts // Renamed file path

import { db } from '~/db/db'; // Your Drizzle DB instance
import { schema } from '~/db/schema/index'; // Assuming 'shapes' schema is exported from here
import { eq } from 'drizzle-orm'; // Import 'eq' for exact matching
import { json } from '@tanstack/react-start';
import { createAPIFileRoute } from '@tanstack/react-start/api';

import { z } from 'zod'; // For input validation

// --- Schema Definitions (Copied from your provided schema) ---

export type ShapePoint = {
  lat: number;
  lon: number;
  sequence: number;
};

// --- Configuration ---

// Define a Zod schema for input validation for the shapeId parameter.
// The shapeId is expected to be a string representing an integer and not empty.
const shapeIdSchema = z.object({
  // Renamed from tripIdSchema
  shapeId: z
    .string()
    .min(1, 'Shape ID cannot be empty.')
    .transform((val) => parseInt(val, 10))
    .refine((val) => !isNaN(val), {
      message: 'Shape ID must be a valid number.',
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

// In-memory cache for shape search results.
// Key: shape ID (string), Value: { data: ShapePoint[], timestamp: number }
const shapeCache = new Map<string, { data: ShapePoint[]; timestamp: number }>();

// Cache Time To Live (TTL) in milliseconds (e.g., 50 minutes = 3000000ms).
// Adjust this based on how often your shape data changes and how fresh you need it to be.
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
 * Defines an API route for fetching shape data by shape ID.
 * This uses `createAPIFileRoute` for structured API definition in Tanstack Start.
 * The route path is `/api/shape-by-id/:shapeId`. // Updated route path
 *
 * The `GET` function handles GET requests and includes in-memory caching for shape results.
 */
export const APIRoute = createAPIFileRoute('/api/v1/shape/$shapeId')({
  // Updated route path
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
    return handleUnauthorizedAccess(origin, 'Shape API - OPTIONS');
  },

  // The 'GET' function handles GET requests to this API route
  GET: async ({ params, request }) => {
    const origin = request.headers.get('Origin');
    // Check if the origin is allowed for GET requests
    if (origin && !ALLOWED_ORIGINS.includes(origin)) {
      return handleUnauthorizedAccess(origin, 'Shape API - GET');
    }

    try {
      // Extract shapeId from URL parameters // Renamed from tripId
      const { shapeId } = params;

      // Validate the shapeId parameter using Zod // Renamed from tripIdSchema
      // The .transform() will convert the string to an integer if valid.
      const validationResult = shapeIdSchema.safeParse({ shapeId }); // Renamed from tripIdSchema

      if (!validationResult.success) {
        // Return a 400 Bad Request if validation fails
        console.warn(
          `[Shape API] Invalid shape ID parameter: "${shapeId}". Details:`, // Renamed from tripId
          validationResult.error.flatten().fieldErrors
        );
        return json(
          {
            error: 'Invalid shape ID.', // Renamed from tripId
            details: validationResult.error.flatten().fieldErrors,
          },
          { status: 400 }
        );
      }

      const searchShapeId = validationResult.data.shapeId; // Renamed from searchTripId
      const cacheKey = String(searchShapeId); // Use string representation for cache key consistency

      // 1. Check in-memory cache first for a valid, non-expired entry
      const cachedEntry = shapeCache.get(cacheKey);
      if (cachedEntry && Date.now() - cachedEntry.timestamp < CACHE_TTL_MS) {
        console.log(
          `[Shape API] Serving from in-memory cache for shape ID: "${cacheKey}".` // Renamed from trip ID
        );
        // Ensure the data from cache is returned with the correct type
        return json(cachedEntry.data, {
          status: 200,
          headers: getCorsHeaders(origin),
        });
      }

      // 2. If not in cache or expired, fetch data from the database
      console.log(`[Shape API] Fetching from DB for shape ID: "${cacheKey}".`); // Renamed from trip ID

      // Drizzle query for exact match on 'id' and selecting 'points'
      const shapeResult = await db
        .select({
          points: schema.shapes.points, // Select the 'points' (ShapePoint[]) column
        })
        .from(schema.shapes)
        .where(eq(schema.shapes.id, searchShapeId)) // Exact match on 'id' using searchShapeId
        .limit(1); // Expecting only one shape per shape ID

      let results: ShapePoint[] = [];

      // If a shape is found, extract its points
      if (shapeResult.length > 0 && shapeResult[0].points) {
        results = shapeResult[0].points;
      }

      // 3. Store the fresh data in the in-memory cache
      shapeCache.set(cacheKey, {
        data: results, // Storing ShapePoint[] objects
        timestamp: Date.now(),
      });

      console.log(
        `[Shape API] DB query completed. Found ${results.length} points for shape ID: "${searchShapeId}". Data cached.` // Renamed from trip ID
      );
      // Return the found shape points as a JSON response
      return json(results, { status: 200, headers: getCorsHeaders(origin) });
    } catch (error) {
      // Catch any unexpected errors during processing and return a 500 error
      return handleServerError(error, 'Shape API - GET');
    }
  },
});
