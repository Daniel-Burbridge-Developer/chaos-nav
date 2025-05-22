// src/routes/api/bustop-info.$stopNumber.ts
import { json } from '@tanstack/react-start';
import { createAPIFileRoute } from '@tanstack/react-start/api';
import { db } from '~/db/db'; // Adjust this path to your Drizzle DB instance
import { stops } from '~/db/schema/stops'; // Adjust this path to your Drizzle schema for stops
import { sql, or } from 'drizzle-orm'; // Ensure 'or' is imported for your where clause

interface StopSuggestion {
  id: number;
  name: string;
  number: string;
}

// Define your allowed origin(s) - IMPORTANT: Replace with your actual production domain!
const ALLOWED_ORIGINS = [
  'http://localhost:5173', // For local development with default Vite port
  'http://localhost:3000', // Common alternative for local development
  'https://chaos-nav.unstablevault.dev/', // !! REPLACE THIS WITH YOUR ACTUAL PRODUCTION DOMAIN !!
  // Add other subdomains or production origins as needed, e.g., 'https://www.your-production-domain.com'
];

export const APIRoute = createAPIFileRoute('/api/busstop-info/$stopNumber')({
  GET: async ({ params, request }) => {
    // 1. Origin/Referer Check for Security
    const origin = request.headers.get('Origin');
    const referer = request.headers.get('Referer');

    console.log('[API Route] Request Origin:', origin);
    console.log('[API Route] Request Referer:', referer);

    // Check if the request comes from an allowed origin or referer (for same-origin navigations)
    const isAllowed =
      (origin && ALLOWED_ORIGINS.includes(origin)) ||
      (referer &&
        ALLOWED_ORIGINS.some((allowed) => referer.startsWith(allowed)));

    if (!isAllowed) {
      console.warn(
        `[API Route] Unauthorized access attempt from Origin: "${origin}" / Referer: "${referer}"`
      );
      return json({ error: 'Unauthorized access' }, { status: 403 });
    }

    // Continue with the rest of your API logic if allowed
    const { stopNumber } = params;

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
            sql`lower(${stops.name}) LIKE ${likeQuery}`,
            sql`lower(${stops.number}) LIKE ${likeQuery}`
          )
        )
        .limit(10); // Limit results for performance

      console.log(
        `[API Route] DB query completed. Found ${results.length} matches for "${stopNumber}".`
      );
      console.log(
        '[API Route] DB query Results (first 3):',
        results.slice(0, 3)
      );

      return json({ data: results });
    } catch (err: any) {
      console.error('[API Route] Error during DB query:', err);
      if (
        err instanceof Error &&
        'code' in err &&
        err.code === 'SQL_PARSE_ERROR'
      ) {
        console.error(
          '[API Route] Libsql SQL Parse Error Details:',
          err.message
        );
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
