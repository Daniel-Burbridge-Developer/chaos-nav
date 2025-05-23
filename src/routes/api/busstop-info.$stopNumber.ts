// src/routes/api/bustop-info.$stopNumber.ts
import { json } from "@tanstack/react-start";
import { createAPIFileRoute } from "@tanstack/react-start/api";
import { db } from "~/db/db";
import { stops } from "~/db/schema/stops";
import { sql, or } from "drizzle-orm";

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

export const APIRoute = createAPIFileRoute("/api/busstop-info/$stopNumber")({
  GET: async ({ params, request }) => {
    const origin = request.headers.get("Origin");
    const referer = request.headers.get("Referer");

    const isAllowed =
      (origin && ALLOWED_ORIGINS.includes(origin)) ||
      (referer &&
        ALLOWED_ORIGINS.some((allowed) => referer.startsWith(allowed)));

    if (!isAllowed) {
      console.warn(
        `[API Route] Unauthorized access attempt from Origin: "<span class="math-inline">\{origin\}" / Referer\: "</span>{referer}"`
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

    // If not in cache or expired, fetch from DB
    console.log(`[API Route] Fetching from DB for "${cacheKey}".`);
    const likeQuery = `${lowerCaseStopNumber}%`; // No leading '%'
    console.log(
      `[API Route] Drizzle LIKE query string (lowercase): "${likeQuery}"`
    );

    try {
      console.log("[API Route] Starting DB query...");
      const results: StopSuggestion[] = await db
        .select({
          id: stops.id,
          name: stops.name,
          number: stops.number,
        })
        .from(stops)
        .where(
          or(
            sql`lower(${stops.name}) LIKE ${likeQuery}`, // Will now use index efficiently
            sql`lower(${stops.number}) LIKE ${likeQuery}` // Will now use index efficiently
          )
        )
        .limit(3); // Limit results for performance

      // Store in cache
      suggestionCache.set(cacheKey, { data: results, timestamp: Date.now() });

      console.log(
        `[API Route] DB query completed. Found <span class="math-inline">\{results\.length\} matches for "</span>{stopNumber}".`
      );
      return json({ data: results });
    } catch (err: any) {
      console.error("[API Route] Error during DB query:", err);
      return json(
        {
          error:
            "Failed to fetch stop suggestions due to server error: " +
            (err.message || "Unknown DB Error"),
        },
        { status: 500 }
      );
    }
  },
});
