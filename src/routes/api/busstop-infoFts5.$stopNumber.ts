// src/routes/api/bustop-info.$stopNumber.ts
import { json } from "@tanstack/react-start";
import { createAPIFileRoute } from "@tanstack/react-start/api";
import { db } from "~/db/db";
import { stops } from "~/db/schema/stops"; // Assuming your original stops table definition
// Import the FTS5 table definition (adjust the path as needed)
// import { stopsFts } from '~/db/schema/stops_fts';
import { sql } from "drizzle-orm";

interface StopSuggestion {
  id: number;
  name: string;
  number: string;
}

const ALLOWED_ORIGINS = [
  "http://localhost:5173",
  "http://localhost:3000",
  "https://chaos-nav.unstablevault.dev/",
];

// In-memory cache for stop suggestions
const suggestionCache = new Map<
  string,
  { data: StopSuggestion[]; timestamp: number }
>();

const CACHE_TTL_MS = 300 * 60 * 1000; // 300 minutes cache TTL

export const APIRoute = createAPIFileRoute("/api/busstop-infoFts5/$stopNumber")(
  {
    GET: async ({ params, request }) => {
      const origin = request.headers.get("Origin");
      const referer = request.headers.get("Referer");

      const isAllowed =
        (origin && ALLOWED_ORIGINS.includes(origin)) ||
        (referer &&
          ALLOWED_ORIGINS.some((allowed) => referer.startsWith(allowed)));

      if (!isAllowed) {
        console.warn(
          `[API Route] Unauthorized access attempt from Origin: "${origin}" / Referer: "${referer}"`
        );
        return json({ error: "Unauthorized access" }, { status: 403 });
      }

      const { stopNumber } = params;

      if (!stopNumber || stopNumber.length < 3) {
        console.warn(
          `[API Route] stopNumber "${stopNumber}" is too short or empty (< 3 chars). Returning empty array.`
        );
        return json({ data: [] }, { status: 200 });
      }

      const lowerCaseStopNumber = stopNumber.toLowerCase();
      const cacheKey = lowerCaseStopNumber; // Use the lowercase query as the cache key

      // Check cache first
      const cachedEntry = suggestionCache.get(cacheKey);
      if (cachedEntry && Date.now() - cachedEntry.timestamp < CACHE_TTL_MS) {
        console.log(`[API Route] Serving from cache for "${cacheKey}".`);
        return json({ data: cachedEntry.data });
      }

      // If not in cache or expired, fetch from DB using FTS5
      console.log(`[API Route] Fetching from DB (FTS5) for "${cacheKey}".`);
      const fts5Query = lowerCaseStopNumber; // The search term for FTS5 MATCH

      try {
        console.log("[API Route] Starting FTS5 DB query...");
        // Important: Adapt this query to your FTS5 table structure.
        // We are joining with the original 'stops' table to get all the details.
        const results = await db.all(sql`
        SELECT
          s.id,
          s.name,
          s.number
        FROM stops_fts f
        JOIN stops s ON f.rowid = s.id -- Assuming rowid in FTS matches stops.id
        WHERE stops_fts MATCH ${fts5Query}
        LIMIT 3;
      `);

        // The 'db.all' returns an array of rows, so we map over results directly.
        const mappedResults = results.map((row: any) => ({
          id: Number(row.id),
          name: String(row.name),
          number: String(row.number),
        }));

        // Store in cache
        suggestionCache.set(cacheKey, {
          data: mappedResults,
          timestamp: Date.now(),
        });

        console.log(
          `[API Route] FTS5 DB query completed. Found ${mappedResults.length} matches for "${stopNumber}".`
        );
        return json({ data: mappedResults });
      } catch (err: any) {
        console.error("[API Route] Error during FTS5 DB query:", err);
        return json(
          {
            error:
              "Failed to fetch stop suggestions due to server error (FTS5): " +
              (err.message || "Unknown DB Error"),
          },
          { status: 500 }
        );
      }
    },
  }
);
