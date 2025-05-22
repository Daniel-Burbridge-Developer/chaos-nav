// src/routes/api/bustop-info.$stopNumber.ts
import { json } from '@tanstack/react-start';
import { createAPIFileRoute } from '@tanstack/react-start/api';
import { db } from '~/db/db'; // Adjust this path to your Drizzle DB instance
import { stops } from '~/db/schema/stops'; // Adjust this path to your Drizzle schema for stops
import { ilike, or } from 'drizzle-orm';

interface StopSuggestion {
  id: number;
  name: string;
  number: string;
}

export const APIRoute = createAPIFileRoute('/api/busstop-id/$stopNumber')({
  GET: async ({ params, request }) => {
    // Add 'request' to params to inspect URL
    console.log(
      '[API Route] Received GET request to /api/bustop-info/$stopNumber'
    );
    console.log('[API Route] Full URL:', request.url);

    // Correctly destructure the dynamic segment from params
    const { stopNumber } = params; // Access the dynamic segment here

    console.log(`[API Route] Extracted stopNumber parameter: "${stopNumber}"`);

    if (!stopNumber || stopNumber.length < 2) {
      console.warn(
        `[API Route] stopNumber "${stopNumber}" is too short or empty (< 2 chars). Returning empty array.`
      );
      return json({ data: [] }, { status: 200 });
    }

    // For Drizzle's `ilike`, we still need to wrap with '%'
    const likestopNumber = `%${stopNumber}%`;
    console.log(
      `[API Route] Drizzle LIKE stopNumber string: "${likestopNumber}"`
    );

    try {
      console.log('[API Route] Starting DB stopNumber...');
      const results: StopSuggestion[] = await db
        .select({
          id: stops.id,
          name: stops.name,
          number: stops.number,
        })
        .from(stops)
        .where(
          or(
            ilike(stops.name, likestopNumber),
            ilike(stops.number, likestopNumber)
          )
        )
        .limit(10); // Limit results for performance

      console.log(
        `[API Route] DB stopNumber completed. Found ${results.length} matches for "${stopNumber}".`
      );
      console.log(
        '[API Route] DB stopNumber Results (first 3):',
        results.slice(0, 3)
      ); // Log a subset if many results

      return json({ data: results }); // Default status is 200
    } catch (err: any) {
      console.error('[API Route] Error during DB stopNumber:', err);
      // Log more specific error details if available
      if (err.sqlMessage || err.originalError) {
        // Common for database errors
        console.error(
          '[API Route] Database error details:',
          err.sqlMessage || err.originalError
        );
      }
      return json(
        {
          error:
            'Failed to fetch stop suggestions due to server error.' +
            (err.message || ''),
        },
        { status: 500 }
      );
    }
  },
});
