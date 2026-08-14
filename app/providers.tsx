"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { useState } from "react";

/** One QueryClient for the whole session, mounted at the root layout — not
 *  per-page. A client created inside a page component (the old setup) gets
 *  torn down and rebuilt every time that page unmounts, which happens on
 *  every client-side route change (e.g. canvas -> /workspaces -> canvas).
 *  That wiped the entire cache on every nav, forcing every widget to refetch
 *  everything from zero even if it had just fetched seconds earlier — the
 *  actual cause of the repeated getDocProject/getAlbumPreview calls, not
 *  query complexity or a missing staleTime. */
export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Prefetched/shared data (doc projects, album previews, gmail
            // status, workspace members) is refreshed by our own writes via
            // explicit invalidateQueries calls, not by polling — a long
            // staleTime here just avoids redundant refetches for data we
            // already know is current.
            staleTime: 5 * 60 * 1000,
            // Switching browser tabs shouldn't re-trigger a full round trip
            // to Neon for data that isn't actually stale.
            refetchOnWindowFocus: false,
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {process.env.NODE_ENV === "development" && <ReactQueryDevtools initialIsOpen={false} />}
    </QueryClientProvider>
  );
}
