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

// This defines your new API route at /api/shape-info/:shapeId
export const APIRoute = createAPIFileRoute('/api/shape-info/$shapeId')({
  // Handle OPTIONS requests for CORS preflight
  OPTIONS: async ({ request }) => {
    const origin = request.headers.get('Origin');
    if (origin && ALLOWED_ORIGINS.includes(origin)) {
      return new Response(null, {
        status: 204, // No Content
        headers: {
          'Access-Control-Allow-Origin': origin,
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

    // Basic validation for the shape_id
    if (!shapeId || typeof shapeId !== 'string' || shapeId.trim() === '') {
      console.warn(
        `[Shape API] Invalid or missing shapeId: "${shapeId}". Returning empty array.`
      );
      return json({ data: [] }, { status: 400 }); // Bad Request
    }

    try {
      console.log(`[Shape API] Fetching shapes for shape_id: "${shapeId}"`);

      // Query the database using Drizzle ORM
      const results = await db
        .select()
        .from(shapes)
        .where(eq(shapes.shape_id, shapeId)) // Filter by shape_id
        .orderBy(shapes.shape_pt_sequence); // Order by sequence for logical path

      // Map results to the defined interface for clarity and type safety
      const mappedResults: ShapeEntry[] = results.map((row) => ({
        id: row.id,
        shape_id: row.shape_id,
        shape_pt_lat: row.shape_pt_lat,
        shape_pt_lon: row.shape_pt_lon,
        shape_pt_sequence: row.shape_pt_sequence,
      }));

      console.log(
        `[Shape API] Found ${mappedResults.length} entries for shape_id: "${shapeId}".`
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
