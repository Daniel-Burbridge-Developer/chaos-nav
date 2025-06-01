// src/routes/api/shape-by-trip.$tripId.ts
import { json } from '@tanstack/react-start';
import { createAPIFileRoute } from '@tanstack/react-start/api';
import { db } from '~/db/db'; // Your Drizzle DB instance
import { trips } from '~/db/schema/trips'; // Import your trips schema
import { eq } from 'drizzle-orm'; // Import 'eq' for equality comparison

// Define the response structure for this API
interface ShapeByTripResponse {
  trip_id: string;
  shape_id: string | null; // A trip might not always have a shape_id
}

// Define allowed origins for CORS (adjust as needed for your deployment)
const ALLOWED_ORIGINS = [
  'http://localhost:5173',
  'http://localhost:3000',
  'https://chaos-nav.unstablevault.dev/',
  // Add any other production domains here
];

// In-memory cache for shape_id by trip_id
const shapeByTripCache = new Map<
  string,
  { data: ShapeByTripResponse; timestamp: number }
>();

// Cache Time To Live (TTL) in milliseconds (e.g., 5 minutes = 300000ms)
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes cache TTL

// This defines your new API route at /api/shape-by-trip/:tripId
export const APIRoute = createAPIFileRoute('/api/shape-by-trip/$tripId')({
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

  // Handle GET requests to fetch shape_id by trip_id
  GET: async ({ params, request }) => {
    const origin = request.headers.get('Origin');
    // Allow if origin is missing (same-origin) or in allowed list
    if (origin && !ALLOWED_ORIGINS.includes(origin)) {
      console.warn(
        `[Shape By Trip API] Unauthorized access attempt from Origin: "${origin}"`
      );
      return json({ error: 'Unauthorized access' }, { status: 403 });
    }

    const { tripId } = params; // Extract tripId from the URL parameters
    const cacheKey = tripId; // Use tripId as cache key

    // 1. Basic validation for the tripId
    if (!tripId || typeof tripId !== 'string' || tripId.trim() === '') {
      console.warn(
        `[Shape By Trip API] Invalid or missing tripId: "${tripId}". Returning error.`
      );
      return json({ error: 'Invalid or missing trip ID' }, { status: 400 }); // Bad Request
    }

    // 2. Check cache first
    const cachedEntry = shapeByTripCache.get(cacheKey);
    if (cachedEntry && Date.now() - cachedEntry.timestamp < CACHE_TTL_MS) {
      console.log(
        `[Shape By Trip API] Serving from cache for trip_id: "${cacheKey}".`
      );
      return json(cachedEntry.data);
    }

    // 3. If not in cache or expired, fetch from DB
    console.log(
      `[Shape By Trip API] Fetching from DB for trip_id: "${cacheKey}".`
    );
    try {
      const result = await db
        .select({
          trip_id: trips.trip_id,
          shape_id: trips.shape_id,
        })
        .from(trips)
        .where(eq(trips.trip_id, tripId))
        .limit(1); // Only need one result

      const responseData: ShapeByTripResponse = {
        trip_id: tripId,
        shape_id: result.length > 0 ? result[0].shape_id : null,
      };

      // 4. Store fresh data in cache
      shapeByTripCache.set(cacheKey, {
        data: responseData,
        timestamp: Date.now(),
      });

      console.log(
        `[Shape By Trip API] DB query completed. Found shape_id "${responseData.shape_id}" for trip_id: "${tripId}". Data cached.`
      );
      return json(responseData);
    } catch (err: any) {
      console.error(
        `[Shape By Trip API] Error fetching shape_id for "${tripId}":`,
        err
      );
      return json(
        {
          error:
            'Failed to fetch shape ID due to server error: ' +
            (err.message || 'Unknown DB Error'),
        },
        { status: 500 } // Internal Server Error
      );
    }
  },
});
