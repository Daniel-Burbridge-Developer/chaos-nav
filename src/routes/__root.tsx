// src/routes/__root.tsx
import {
  HeadContent,
  Link,
  Outlet,
  Scripts,
  createRootRoute,
} from '@tanstack/react-router';
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools';
import * as React from 'react';
import { DefaultCatchBoundary } from '~/components/DefaultCatchBoundary';
import { NotFound } from '~/components/NotFound';
import appCss from '~/styles/app.css?url';
import { seo } from '~/utils/seo'; // Corrected import syntax for seo
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Analytics } from '@vercel/analytics/react';

// Import persistence libraries
import { persistQueryClient } from '@tanstack/query-persist-client-core';
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister';

// Create a client instance outside the component to ensure it's a singleton
// and can be used for persistence setup.
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Default cache time for general queries (e.g., 5 minutes)
      // This can be overridden per useQuery call if needed
      staleTime: 0, // Default to 0, or a small value if most data isn't static
    },
  },
});

// Create a persister for localStorage
// Ensure this runs only in a browser environment
const persister = createSyncStoragePersister({
  storage: typeof window !== 'undefined' ? window.localStorage : undefined,
});

// Persist the query client
// This block ensures persistence is set up once when the app loads
if (typeof window !== 'undefined') {
  persistQueryClient({
    queryClient,
    persister,
    maxAge: Infinity, // Keep persisted cache indefinitely for static data
    buster: 'v1', // Increment this string ('v1', 'v2', etc.) if your stop data changes or schema updates
    dehydrateOptions: {
      // Only dehydrate/persist queries with 'stopSuggestions' in their queryKey
      shouldDehydrateQuery: (query) =>
        query.queryKey[0] === 'stopSuggestions' &&
        query.state.data !== undefined,
    },
  });
}

export const Route = createRootRoute({
  head: () => ({
    meta: [
      {
        charSet: 'utf-8',
      },
      {
        name: 'viewport',
        content: 'width=device-width, initial-scale=1',
      },
      // Ensure seo is called as a function if it's imported as such
      ...seo({
        title: 'Transperth Multi-Stop Live Viewer', // Updated title
        description: `View live bus times for multiple Transperth stops.`, // Updated description
      }),
    ],
    links: [
      { rel: 'stylesheet', href: appCss },
      {
        rel: 'apple-touch-icon',
        sizes: '180x180',
        href: '/apple-touch-icon.png',
      },
      {
        rel: 'icon',
        type: 'image/png',
        sizes: '32x32',
        href: '/favicon-32x32.png',
      },
      {
        rel: 'icon',
        type: 'image/png',
        sizes: '16x16',
        href: '/favicon-16x16.png',
      },
      { rel: 'manifest', href: '/site.webmanifest', color: '#fffff' },
      { rel: 'icon', href: '/favicon.ico' },
    ],
  }),
  errorComponent: (props) => {
    return (
      <RootDocument>
        <DefaultCatchBoundary {...props} />
      </RootDocument>
    );
  },
  notFoundComponent: () => <NotFound />,
  component: RootComponent,
});

function RootComponent() {
  return (
    <RootDocument>
      <Outlet />
    </RootDocument>
  );
}

function RootDocument({ children }: { children: React.ReactNode }) {
  // Pass the globally defined queryClient instance to QueryClientProvider
  return (
    <html>
      <QueryClientProvider client={queryClient}>
        {' '}
        {/* <<< --- THIS IS THE CRUCIAL CHANGE */}
        <head>
          <HeadContent />
        </head>
        <body>
          {children}
          <TanStackRouterDevtools position='bottom-right' />
          <Analytics />
          <Scripts />
        </body>
      </QueryClientProvider>
    </html>
  );
}
