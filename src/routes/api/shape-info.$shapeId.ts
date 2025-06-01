// src/routes/api/shape-info.$shapeId.ts
import { json } from '@tanstack/react-start';
import { createAPIFileRoute } from '@tanstack/react-start/api';
import { db } from '~/db/db'; // Your Drizzle DB instance
import { shapes } from '~/db/schema/shapes'; // Import your shapes schema
import { eq } from 'drizzle-orm'; // Import 'eq' for equality comparison

// Define the type for a single shape entry as it will be returned by the API
interface ShapeEntry {
  id: number;
  shape_id: string;
  shape_pt_lat: number;
  shape_pt_lon: number;
  shape_pt_sequence: number;
}

// Define allowed origins for CORS (adjust as needed for your deployment)
const ALLOWED_ORIGINS = [
  'http://localhost:5173',
  'http://localhost:3000',
  'https://chaos-nav.unstablevault.dev/',
  // Add any other production domains here
];

// In-memory cache for shape data
const shapeCache = new Map<string, { data: ShapeEntry[]; timestamp: number }>();

// Cache Time To Live (TTL) in milliseconds (e.g., 5 minutes = 300000ms)
// Adjust this based on how often your shape data changes and how fresh you need it to be.
const CACHE_TTL_MS = 50 * 60 * 1000; // 5 minutes cache TTL

// This defines your new API route at /api/shape-info/:shapeId
export const APIRoute = createAPIFileRoute('/api/shape-info/$shapeId')({
  // Handle OPTIONS requests for CORS preflight
  OPTIONS: async ({ request }) => {
    const origin = request.headers.get('Origin');
    if (origin && ALLOWED_ORIGINS.includes(origin)) {
      return new Response(null, {
        status: 204, // No Content
        headers: {
          //   'Access-Control-Allow-Origin': origin,
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET,OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
          'Access-Control-Max-Age': '86400', // Cache preflight for 24 hours
        },
      });
    }
    return new Response(null, { status: 403 }); // Forbidden if origin not allowed
  },

  // Handle GET requests to fetch shape data
  GET: async ({ params, request }) => {
    const origin = request.headers.get('Origin');
    // Allow if origin is missing (same-origin) or in allowed list
    // if (origin && !ALLOWED_ORIGINS.includes(origin)) {
    //   console.warn(
    //     `[Shape API] Unauthorized access attempt from Origin: "${origin}"`
    //   );
    //   return json({ error: 'Unauthorized access' }, { status: 403 });
    // }

    const { shapeId } = params; // Extract shapeId from the URL parameters
    const cacheKey = shapeId.toLowerCase(); // Use lowercase shapeId as cache key for consistency

    // 1. Basic validation for the shape_id
    if (!shapeId || typeof shapeId !== 'string' || shapeId.trim() === '') {
      console.warn(
        `[Shape API] Invalid or missing shapeId: "${shapeId}". Returning empty array.`
      );
      return json({ data: [] }, { status: 400 }); // Bad Request
    }

    // 2. Check cache first
    const cachedEntry = shapeCache.get(cacheKey);
    if (cachedEntry && Date.now() - cachedEntry.timestamp < CACHE_TTL_MS) {
      console.log(
        `[Shape API] Serving from cache for shape_id: "${cacheKey}".`
      );
      return json({ data: cachedEntry.data });
    }

    // 3. If not in cache or expired, fetch from DB
    console.log(`[Shape API] Fetching from DB for shape_id: "${cacheKey}".`);
    try {
      const results = await db
        .select()
        .from(shapes)
        .where(eq(shapes.shape_id, shapeId)) // Filter by shape_id
        .orderBy(shapes.shape_pt_sequence); // Order by sequence for logical path

      const mappedResults: ShapeEntry[] = results.map((row) => ({
        id: row.id,
        shape_id: row.shape_id,
        shape_pt_lat: row.shape_pt_lat,
        shape_pt_lon: row.shape_pt_lon,
        shape_pt_sequence: row.shape_pt_sequence,
      }));

      // 4. Store fresh data in cache
      shapeCache.set(cacheKey, {
        data: mappedResults,
        timestamp: Date.now(),
      });

      console.log(
        `[Shape API] DB query completed. Found ${mappedResults.length} entries for shape_id: "${shapeId}". Data cached.`
      );
      return json({ data: mappedResults }); // Return the found data
    } catch (err: any) {
      console.error(`[Shape API] Error fetching shapes for "${shapeId}":`, err);
      return json(
        {
          error:
            'Failed to fetch shape data due to server error: ' +
            (err.message || 'Unknown DB Error'),
        },
        { status: 500 } // Internal Server Error
      );
    }
  },
});
