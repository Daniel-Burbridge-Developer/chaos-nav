// src/routes/api/v1/livestop/$stopNumber.tsx (OR wherever your API file is located)
import { json } from '@tanstack/react-start';
import { createAPIFileRoute } from '@tanstack/react-start/api';
import * as cheerio from 'cheerio';
import { z } from 'zod'; // For input validation

// --- Configuration ---

// Define a Zod schema for input validation for the stopNumber parameter
const stopNumberSchema = z.object({
  stopNumber: z.string().min(1, 'Stop number cannot be empty.'),
});

// Define allowed origins for CORS.
const ALLOWED_ORIGINS = [
  'http://localhost:5173',
  'http://localhost:3000',
  'https://chaos-nav.unstablevault.dev/',
  // Add any other production domains here
];

// Define the structure of a single live stop result object
interface LiveStopResult {
  liveStatus: boolean;
  busNumber: string;
  timeUntilArrival: string;
  destination: string;
  tripId: string;
  fleetId: string | null;
}

// In-memory cache for live stop search results.
// Key: stop number (lowercase), Value: { data: LiveStopResult[], timestamp: number }
const liveStopCache = new Map<
  string,
  { data: LiveStopResult[]; timestamp: number }
>();

// Cache Time To Live (TTL) in milliseconds (e.g., 10 seconds = 10000ms).
const CACHE_TTL_MS = 10 * 1000; // 10 seconds cache TTL

// --- Helper Functions ---

/**
 * Generates CORS headers for a given origin.
 * @param origin The origin from the request header.
 * @returns Headers object with CORS settings.
 */
function getCorsHeaders(origin: string | null): Headers {
  const headers = new Headers();
  if (origin) {
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

export const APIRoute = createAPIFileRoute('/api/v1/livestop/$stopNumber')({
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
    return handleUnauthorizedAccess(origin, 'Live Stop API - OPTIONS');
  },

  GET: async ({ params, request }) => {
    const origin = request.headers.get('Origin');
    // Check if the origin is allowed for GET requests
    if (origin && !ALLOWED_ORIGINS.includes(origin)) {
      return handleUnauthorizedAccess(origin, 'Live Stop API - GET');
    }

    try {
      // Extract stopNumber from URL parameters
      const { stopNumber } = params;

      // Validate the stopNumber parameter using Zod
      const validationResult = stopNumberSchema.safeParse({ stopNumber });

      if (!validationResult.success) {
        // Return a 400 Bad Request if validation fails
        console.warn(
          `[Live Stop API] Invalid stop number parameter: "${stopNumber}". Details:`,
          validationResult.error.flatten().fieldErrors
        );
        return json(
          {
            error: 'Invalid stop number.',
            details: validationResult.error.flatten().fieldErrors,
          },
          { status: 400 }
        );
      }

      const searchStopNumber = validationResult.data.stopNumber;
      const cacheKey = searchStopNumber.toLowerCase(); // Use lowercase stop number as cache key for consistency

      // 1. Check in-memory cache first for a valid, non-expired entry
      const cachedEntry = liveStopCache.get(cacheKey);
      if (cachedEntry && Date.now() - cachedEntry.timestamp < CACHE_TTL_MS) {
        console.log(
          `[Live Stop API] Serving from in-memory cache for stop number: "${cacheKey}".`
        );
        // Ensure the data from cache is returned with the correct type
        return json(
          { data: cachedEntry.data },
          {
            status: 200,
            headers: getCorsHeaders(origin),
          }
        );
      }

      // 2. If not in cache or expired, fetch data from the external URL
      const url = `https://136213.mobi/RealTime/RealTimeStopResults.aspx?SN=${searchStopNumber}`;
      console.log('Scraping:', url);

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to fetch page: ${response.statusText}`);
      }
      const rawHtml = await response.text();

      const $ = cheerio.load(rawHtml);
      const timetableElement = $('#pnlStopTimetable');

      if (timetableElement.length === 0) {
        console.warn(
          `[Live Stop API] #pnlStopTimetable not found for stop number: ${searchStopNumber}.`
        );
        return json(
          { error: 'Failed to find timetable data on the page.' },
          { status: 500, headers: getCorsHeaders(origin) }
        );
      }

      const parsedData: LiveStopResult[] = parseTimetableHtml(
        timetableElement.html() || ''
      );

      // 3. Store the fresh data in the in-memory cache
      liveStopCache.set(cacheKey, {
        data: parsedData,
        timestamp: Date.now(),
      });

      console.log(
        `[Live Stop API] External scrape completed. Found ${parsedData.length} entries for stop number: "${searchStopNumber}". Data cached.`
      );
      return json(
        { data: parsedData },
        { status: 200, headers: getCorsHeaders(origin) }
      );
    } catch (err: any) {
      return handleServerError(err, 'Live Stop API - GET');
    }
  },
});

function parseTimetableHtml(html: string): LiveStopResult[] {
  const $ = cheerio.load(html);
  const rows: LiveStopResult[] = [];

  $('.tpm_row_timetable').each((_, el) => {
    const row = $(el);

    const tripId = row.data('tripid')?.toString() || '';
    const fleetId = row.data('fleet')?.toString() || null;

    if (!tripId) {
      console.warn('Could not extract tripId for a row.');
    }

    const liveStatus =
      row.find('.tt-livetext').text().trim().toUpperCase() === 'LIVE';

    const busNumber = row.children('div').eq(0).find('span').text().trim();

    const timeUntilArrival = row
      .children('div')
      .eq(2)
      .find('strong')
      .text()
      .trim();

    let destination = row
      .children('div')
      .eq(1)
      .find('.route-display-name')
      .first()
      .text()
      .trim();

    if (destination.toLowerCase().startsWith('to ')) {
      destination = destination.substring(3).trim();
    }

    if (!timeUntilArrival) {
      console.warn('Could not extract timeUntilArrival for a row.');
    }
    if (!destination) {
      console.warn('Could not extract destination for a row.');
    }

    rows.push({
      liveStatus,
      busNumber,
      timeUntilArrival,
      destination,
      tripId,
      fleetId,
    });
  });

  return rows;
}
