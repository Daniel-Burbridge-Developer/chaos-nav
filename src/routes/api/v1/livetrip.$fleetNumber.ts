import { json } from '@tanstack/react-start';
import { createAPIFileRoute } from '@tanstack/react-start/api';
import * as cheerio from 'cheerio';
import { z } from 'zod'; // For input validation

// --- Configuration ---

// Define Zod schema for input validation for the fleetNumber parameter
const fleetNumberSchema = z.object({
  fleetNumber: z.string().min(1, 'Fleet number cannot be empty.'),
});

// Define allowed origins for CORS.
// IMPORTANT: For production, list specific domains that need access.
const ALLOWED_ORIGINS = [
  'http://localhost:5173',
  'http://localhost:3000',
  'https://chaos-nav.unstablevault.dev/',
  // Add any other production domains here
];

interface LiveTripStop {
  stopName: string;
  stopNumber: string;
  time: string;
  status: string; // e.g., "Departed", "Predicted", "Unknown"
}

interface LiveTripData {
  routeNumber: string | null;
  associatedFleetNumber: string | null; // The fleet number displayed on the page
  serviceAlert: string | null;
  stops: LiveTripStop[];
}

// In-memory cache for live trip results.
// Key: fleet number (lowercase), Value: { data: LiveTripData, timestamp: number }
const liveTripCache = new Map<
  string,
  { data: LiveTripData; timestamp: number }
>();

// Cache Time To Live (TTL) in milliseconds (10 seconds).
const CACHE_TTL_MS = 10 * 1000; // 10 seconds cache TTL

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

function parseLiveTripHtml(html: string): LiveTripData {
  const $ = cheerio.load(html);

  const routeNumberText = $('#lblTripHeading').text().trim(); // e.g., "Route 584"
  const routeNumber = routeNumberText.replace('Route ', '').trim() || null;

  const fleetNumberText = $('#lblTripHeading2').text().trim(); // e.g., " with bus 2615"
  const associatedFleetNumber =
    fleetNumberText.replace(' with bus ', '').trim() || null;

  const serviceAlertLink = $('#interruption_link');
  let serviceAlert = null;
  if (serviceAlertLink.length > 0 && serviceAlertLink.text().trim()) {
    serviceAlert = serviceAlertLink.text().trim();
  }

  const stops: LiveTripStop[] = [];
  const stopsContainer = $('#serverSideRenderList'); // Based on provided HTML, stops are here

  if (stopsContainer.length === 0) {
    console.warn(
      '#serverSideRenderList not found. Trip stops might be missing or loaded dynamically.'
    );
  }

  stopsContainer.find('.tpm_row_fleettrip_wrap').each((_, el) => {
    const row = $(el);
    const stopName = row.find('.service-stop-name').text().trim();
    const stopNumberText = row.find('.service-stop-number').text().trim(); // e.g., "Stop 17382"
    const stopNumber = stopNumberText.replace('Stop ', '').trim();
    const time = row.find('.service-time').text().trim();

    let status = 'Unknown';
    if (row.hasClass('Departed')) {
      status = 'Departed';
    } else if (row.hasClass('Predicted')) {
      status = 'Predicted';
    } else {
      const statusFlagText = row.find('.service-status-flag').text().trim();
      if (statusFlagText) {
        status = statusFlagText.replace(/[()]/g, '').trim();
      }
    }

    if (stopName && stopNumber && time) {
      stops.push({
        stopName,
        stopNumber,
        time,
        status,
      });
    } else {
      console.warn(
        'Could not extract complete stop data for a row. HTML: ',
        row.html()?.substring(0, 100) + '...'
      );
    }
  });

  return { routeNumber, associatedFleetNumber, serviceAlert, stops };
}

// --- API Route Definition ---

export const APIRoute = createAPIFileRoute('/api/v1/livetrip/$fleetNumber')({
  // Handle OPTIONS requests for CORS preflight
  OPTIONS: async ({ request }) => {
    const origin = request.headers.get('Origin');
    if (origin && ALLOWED_ORIGINS.includes(origin)) {
      return new Response(null, {
        status: 204,
        headers: getCorsHeaders(origin),
      });
    }
    return handleUnauthorizedAccess(origin, 'Live Trip API - OPTIONS');
  },

  GET: async ({ params, request }) => {
    const origin = request.headers.get('Origin');
    // Check if the origin is allowed for GET requests
    if (origin && !ALLOWED_ORIGINS.includes(origin)) {
      return handleUnauthorizedAccess(origin, 'Live Trip API - GET');
    }

    try {
      const { fleetNumber } = params;

      // Validate the fleetNumber parameter using Zod
      const validationResult = fleetNumberSchema.safeParse({ fleetNumber });

      if (!validationResult.success) {
        console.warn(
          `[Live Trip API] Invalid fleet number parameter: "${fleetNumber}". Details:`,
          validationResult.error.flatten().fieldErrors
        );
        return json(
          {
            error: 'Invalid fleet number.',
            details: validationResult.error.flatten().fieldErrors,
          },
          { status: 400 }
        );
      }

      const searchFleetNumber = validationResult.data.fleetNumber;
      const cacheKey = searchFleetNumber.toLowerCase(); // Use lowercase fleet number as cache key

      // 1. Check in-memory cache first for a valid, non-expired entry
      const cachedEntry = liveTripCache.get(cacheKey);
      if (cachedEntry && Date.now() - cachedEntry.timestamp < CACHE_TTL_MS) {
        console.log(
          `[Live Trip API] Serving from in-memory cache for fleet number: "${cacheKey}".`
        );
        return json(
          { data: cachedEntry.data },
          {
            status: 200,
            headers: getCorsHeaders(origin),
          }
        );
      }

      // 2. If not in cache or expired, fetch data from the external URL
      const url = `https://136213.mobi/RealTime/RealTimeFleetTrip.aspx?nq=false&fleet=${searchFleetNumber}`;
      console.log('Scraping live trip for fleet:', url);

      const response = await fetch(url);
      if (!response.ok) {
        if (response.status === 404) {
          console.warn(
            `Page not found for fleet ${searchFleetNumber} at ${url}. May indicate invalid fleet or no trip.`
          );
          return json(
            {
              error: `No trip information found for fleet number ${searchFleetNumber}. It might be invalid or not currently running.`,
            },
            { status: 404, headers: getCorsHeaders(origin) }
          );
        }
        throw new Error(
          `Failed to fetch page: ${response.status} ${response.statusText}`
        );
      }
      const rawHtml = await response.text();
      const $ = cheerio.load(rawHtml);

      if (
        $('#lblTripHeading').length === 0 &&
        $('#serverSideRenderList').length === 0
      ) {
        console.warn(
          `Core elements for trip data not found for fleet number: ${searchFleetNumber}. The page structure might have changed, the fleet number could be incorrect, or there's no active trip.`
        );
        return json(
          {
            error:
              'Failed to find expected trip data structure on the page for fleet ' +
              searchFleetNumber +
              '. The fleet might not be active or the page is different than expected.',
          },
          { status: 404, headers: getCorsHeaders(origin) }
        );
      }

      const parsedData: LiveTripData = parseLiveTripHtml(rawHtml);

      if (
        !parsedData.routeNumber &&
        parsedData.stops.length === 0 &&
        !parsedData.associatedFleetNumber
      ) {
        console.warn(
          `No meaningful data extracted for fleet ${searchFleetNumber}. The fleet might have no current trip data, or the page structure for this state is not fully handled.`
        );
      }

      // 3. Store the fresh data in the in-memory cache
      liveTripCache.set(cacheKey, {
        data: parsedData,
        timestamp: Date.now(),
      });

      console.log(
        `[Live Trip API] External scrape completed. Data cached for fleet: "${searchFleetNumber}".`
      );
      return json(
        { data: parsedData },
        { status: 200, headers: getCorsHeaders(origin) }
      );
    } catch (err: any) {
      return handleServerError(err, 'Live Trip API - GET');
    }
  },
});
