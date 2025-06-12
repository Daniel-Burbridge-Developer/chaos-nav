import { z, ZodError } from 'zod';

interface RequestPayload {
  [key: string]: unknown;
}

interface ApiFetchOptions extends RequestInit {
  cacheLifetimeMs?: number;
  responseSchema?: z.ZodTypeAny;
}

const cache = new Map<string, { data: unknown; timestamp: number }>();
const DEFAULT_CACHE_LIFETIME_MS = 60 * 60 * 1000; // 1 Hour

export const apiFetch = async <T>(
  url: string,
  data?: RequestPayload,
  options: ApiFetchOptions = {}
): Promise<T> => {
  const method = options.method?.toUpperCase() || 'GET';
  const fullUrl = url;

  const effectiveCacheLifetime =
    options.cacheLifetimeMs !== undefined
      ? options.cacheLifetimeMs
      : DEFAULT_CACHE_LIFETIME_MS;

  // 1. Handle Caching for GET requests
  if (method === 'GET' && effectiveCacheLifetime > 0) {
    const cachedEntry = cache.get(fullUrl);
    if (
      cachedEntry &&
      Date.now() - cachedEntry.timestamp < effectiveCacheLifetime
    ) {
      console.log(
        `Cache hit for: ${fullUrl} (TTL: ${effectiveCacheLifetime / 1000}s)`
      );
      // Validate cached data if a schema is provided
      if (options.responseSchema) {
        try {
          return options.responseSchema.parse(cachedEntry.data) as T;
        } catch (validationError) {
          console.error(
            `Cached data for ${fullUrl} failed validation! Re-fetching.`
          );
          cache.delete(fullUrl); // Invalidate bad cache
        }
      } else {
        return cachedEntry.data as T;
      }
    } else if (cachedEntry) {
      console.log(`Cache expired for: ${fullUrl}`);
      cache.delete(fullUrl);
    }
  }

  // 2. Prepare Headers
  const headers: Record<string, string> = {
    Accept: 'application/json',
    ...((options.headers as Record<string, string>) || {}),
  };

  // 3. Prepare the request body
  let requestBody: BodyInit | undefined;
  if (data) {
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
      headers['Content-Type'] = 'application/json';
      requestBody = JSON.stringify(data);
    } else {
      console.warn(
        `Warning: Data provided for a ${method} request. It will be ignored as ${method} requests typically don't have a body. Consider using query parameters for GET.`
      );
      requestBody = undefined;
    }
  } else if (options.body) {
    requestBody = options.body;
  }

  // 4. Perform the fetch
  try {
    const res = await fetch(fullUrl, {
      ...options,
      method,
      headers,
      body: requestBody,
    });

    // 5. Centralized Error Handling
    if (!res.ok) {
      let errorMessage = `API error: ${res.status} ${res.statusText}`;
      try {
        const errorData = await res.json();
        if (errorData && errorData.message) {
          errorMessage = `API error (${res.status}): ${errorData.message}`;
        } else if (typeof errorData === 'string') {
          errorMessage = `API error (${res.status}): ${errorData}`;
        }
      } catch (e) {
        // Ignore if response body isn't JSON or is empty
      }
      throw new Error(errorMessage);
    }

    // 6. Parse and Validate Response
    const rawData: unknown = await res.json(); // Fetch raw data as unknown

    let validatedData: T;
    if (options.responseSchema) {
      try {
        validatedData = options.responseSchema.parse(rawData) as T;
        console.log(`Successfully validated response for: ${fullUrl}`);
      } catch (error) {
        if (error instanceof ZodError) {
          console.error(`Validation error for ${fullUrl}:`, error.issues);
          throw new Error(
            `Invalid API response format for ${fullUrl}: ${error.message}`
          );
        }
        throw error; // Re-throw other types of errors
      }
    } else {
      // If no schema is provided, assume the type T and proceed
      validatedData = rawData as T;
      console.warn(
        `No response schema provided for ${fullUrl}. Data is not runtime validated.`
      );
    }

    // 7. Cache Validated Response (for GET requests)
    if (method === 'GET' && effectiveCacheLifetime > 0) {
      cache.set(fullUrl, { data: validatedData, timestamp: Date.now() });
      console.log(
        `Cached new data for: ${fullUrl} (TTL: ${effectiveCacheLifetime / 1000}s)`
      );
    }

    return validatedData;
  } catch (error) {
    console.error(`Error in apiFetch for ${fullUrl}:`, error);
    throw error;
  }
};
