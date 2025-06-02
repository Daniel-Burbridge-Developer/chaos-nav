// src/routes/api/trips-by-route-exact.$routeQuery.ts
import { json } from '@tanstack/react-start';
import { createAPIFileRoute } from '@tanstack/react-start/api';
import { db } from '~/db/db'; // Your Drizzle DB instance
import { routes } from '~/db/schema/routes'; // Import your routes schema
import { trips } from '~/db/schema/trips'; // Import your trips schema
import { eq, or, sql, inArray } from 'drizzle-orm'; // Import 'eq', 'or', 'sql', and 'inArray' for comparisons

// Define the type for a single route entry (if you want to include it in the response)
interface RouteInfo {
  route_id: string;
  route_short_name: string | null;
  route_long_name: string | null;
}

// Define the type for a single trip entry (you might simplify this later)
interface TripInfo {
  trip_id: string;
  route_id: string; // Include route_id for context
  trip_headsign: string | null;
}

// Define the final response structure
interface TripResponse {
  route?: RouteInfo; // Optional route details if found (only the first one if multiple matches)
  trip_ids: string[]; // List of associated trip_ids
  trips_details?: TripInfo[]; // Optional: detailed trip info
}

// Define allowed origins for CORS (adjust as needed for your deployment)
const ALLOWED_ORIGINS = [
  'http://localhost:5173',
  'http://localhost:3000',
  'https://chaos-nav.unstablevault.dev/',
  // Add any other production domains here
];

// In-memory cache for trip data based on route query
const tripCache = new Map<string, { data: TripResponse; timestamp: number }>();

// Cache Time To Live (TTL) in milliseconds (e.g., 5 minutes = 300000ms)
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes cache TTL

// This defines your new API route at /api/trips-by-route-exact/:routeQuery
export const APIRoute = createAPIFileRoute(
  '/api/trip-from-route-exact/$routeQuery'
)({
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
        `[Trips API] Unauthorized access attempt from Origin: "${origin}"`
      );
      return json({ error: 'Unauthorized access' }, { status: 403 });
    }

    const { routeQuery } = params; // Extract routeQuery from the URL parameters
    const cacheKey = routeQuery.toLowerCase(); // Use lowercase for cache key consistency and case-insensitive lookup

    // 1. Basic validation for the route query
    if (
      !routeQuery ||
      typeof routeQuery !== 'string' ||
      routeQuery.trim() === ''
    ) {
      console.warn(
        `[Trips API] Invalid or missing routeQuery: "${routeQuery}". Returning empty data.`
      );
      return json({ trip_ids: [] }, { status: 400 }); // Bad Request
    }

    // 2. Check cache first
    const cachedEntry = tripCache.get(cacheKey);
    if (cachedEntry && Date.now() - cachedEntry.timestamp < CACHE_TTL_MS) {
      console.log(
        `[Trips API] Serving from cache for route query (exact): "${cacheKey}".`
      );
      return json(cachedEntry.data);
    }

    // 3. If not in cache or expired, fetch from DB
    console.log(
      `[Trips API] Fetching from DB for route query (exact): "${cacheKey}".`
    );
    try {
      // Convert the input query to lowercase for a case-insensitive exact match
      const lowercasedQuery = routeQuery.toLowerCase();

      // First, find routes matching the query in route_short_name or route_long_name exactly
      // We'll use SQL `lower()` function for case-insensitive exact comparison.
      const matchingRoutes = await db
        .select({
          route_id: routes.id,
          route_short_name: routes.short_name,
          route_long_name: routes.long_name,
        })
        .from(routes)
        .where(
          or(
            eq(sql`lower(${routes.short_name})`, lowercasedQuery),
            eq(sql`lower(${routes.long_name})`, lowercasedQuery)
          )
        );

      if (matchingRoutes.length === 0) {
        console.log(
          `[Trips API] No routes found for exact query: "${routeQuery}".`
        );
        const responseData: TripResponse = { trip_ids: [] };
        tripCache.set(cacheKey, { data: responseData, timestamp: Date.now() });
        return json(responseData);
      }

      // Extract route_ids from the matching routes
      const routeIds = matchingRoutes.map((r) => r.route_id);

      // Fetch trips associated with the found route_ids
      const associatedTrips = await db
        .select({
          trip_id: trips.id,
          route_id: trips.route_id,
          trip_headsign: trips.trip_headsign,
        })
        .from(trips)
        .where(inArray(trips.route_id, routeIds)); // Use inArray for multiple route_ids

      const tripIdsOnly = associatedTrips.map((t) => t.trip_id);
      const tripDetails: TripInfo[] = associatedTrips.map((t) => ({
        trip_id: t.trip_id,
        route_id: t.route_id,
        trip_headsign: t.trip_headsign,
      }));

      // Structure the response
      const responseData: TripResponse = {
        route: matchingRoutes[0] || undefined, // You might want to return all matching routes if multiple
        trip_ids: tripIdsOnly,
        trips_details: tripDetails, // Optionally include detailed trip info
      };

      // 4. Store fresh data in cache
      tripCache.set(cacheKey, {
        data: responseData,
        timestamp: Date.now(),
      });

      console.log(
        `[Trips API] DB query completed. Found ${matchingRoutes.length} matching routes and ${tripIdsOnly.length} associated trips for exact query: "${routeQuery}". Data cached.`
      );
      return json(responseData);
    } catch (err: any) {
      console.error(
        `[Trips API] Error fetching trips for "${routeQuery}":`,
        err
      );
      return json(
        {
          error:
            'Failed to fetch trip data due to server error: ' +
            (err.message || 'Unknown DB Error'),
        },
        { status: 500 } // Internal Server Error
      );
    }
  },
});
