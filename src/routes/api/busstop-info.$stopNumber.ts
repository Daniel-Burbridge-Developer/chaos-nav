// src/routes/api/bustop-info.$stopNumber.ts
import { json } from '@tanstack/react-start';
import { createAPIFileRoute } from '@tanstack/react-start/api';
import { db } from '~/db/db'; // Adjust this path to your Drizzle DB instance
import { stops } from '~/db/schema/stops'; // Adjust this path to your Drizzle schema for stops
// Import 'sql' for raw SQL snippets and 'lower' for string manipulation
import { ilike, or, sql } from 'drizzle-orm';

interface StopSuggestion {
  id: number;
  name: string;
  number: string;
}

export const APIRoute = createAPIFileRoute('/api/busstop-info/$stopNumber')({
  GET: async ({ params, request }) => {
    const { stopNumber } = params; // Access the dynamic segment from params

    console.log(
      '[API Route] Received GET request to /api/busstop-info/$stopNumber'
    );
    console.log('[API Route] Full URL:', request.url);
    console.log(`[API Route] Extracted stopNumber parameter: "${stopNumber}"`);

    if (!stopNumber || stopNumber.length < 3) {
      console.warn(
        `[API Route] stopNumber "${stopNumber}" is too short or empty (< 3 chars). Returning empty array.`
      );
      return json({ data: [] }, { status: 200 });
    }

    // Convert the input search term to lowercase once
    const lowerCaseStopNumber = stopNumber.toLowerCase();
    const likeQuery = `%${lowerCaseStopNumber}%`;
    console.log(
      `[API Route] Drizzle LIKE query string (lowercase): "${likeQuery}"`
    );

    try {
      console.log('[API Route] Starting DB query...');
      const results: StopSuggestion[] = await db
        .select({
          id: stops.id,
          name: stops.name,
          number: stops.number,
        })
        .from(stops)
        .where(
          or(
            // Use sql.lower() for the column and apply LIKE to the lowercase query
            sql`lower(${stops.name}) LIKE ${likeQuery}`,
            sql`lower(${stops.number}) LIKE ${likeQuery}`
            // Removed ilike here, explicitly using lower() and LIKE
          )
        )
        .limit(3); // Limit results for performance

      console.log(
        `[API Route] DB query completed. Found ${results.length} matches for "${stopNumber}".`
      );
      console.log(
        '[API Route] DB query Results (first 3):',
        results.slice(0, 3)
      ); // Log a subset if many results

      return json({ data: results }); // Default status is 200
    } catch (err: any) {
      console.error('[API Route] Error during DB query:', err);
      // Detailed error logging for Drizzle/LibSQL
      if (
        err instanceof Error &&
        'code' in err &&
        err.code === 'SQL_PARSE_ERROR'
      ) {
        console.error(
          '[API Route] Libsql SQL Parse Error Details:',
          err.message
        );
        // If there's a 'cause' property with more details
        if ('cause' in err && err.cause instanceof Error) {
          console.error(
            '[API Route] Libsql SQL Parse Error Cause:',
            err.cause.message
          );
        }
      } else {
        console.error(
          '[API Route] General Error Details:',
          err.message || JSON.stringify(err)
        );
      }

      return json(
        {
          error:
            'Failed to fetch stop suggestions due to server error: ' +
            (err.message || 'Unknown DB Error'),
        },
        { status: 500 }
      );
    }
  },
});
