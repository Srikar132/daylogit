"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { useState } from "react";
import { CanvasShell } from "@/components/canvas/canvas-shell";
import { CanvasChrome } from "@/components/canvas/canvas-chrome";
import type { BoardColumn } from "@/lib/worklog";
import type { WidgetLayoutItem } from "@/lib/db";
import type { DocProjectSummary } from "@/lib/actions/docs";
import type { GmailStatus } from "@/lib/actions/gmail";
import type { GmailMessageSummary } from "@/lib/gmail";

interface WorklogDashboardProps {
  slug: string;
  columns: BoardColumn[];
  canWrite: boolean;
  initialLayout: WidgetLayoutItem[] | null;
  initialProjectSummaries: Record<string, DocProjectSummary>;
  initialGmailStatus: GmailStatus;
  initialGmailMessages?: GmailMessageSummary[];
}

export function WorklogDashboard({
  slug,
  columns,
  canWrite,
  initialLayout,
  initialProjectSummaries,
  initialGmailStatus,
  initialGmailMessages,
}: WorklogDashboardProps) {
  // One QueryClient per mounted dashboard, not per-render — a plain module
  // singleton would leak cache across different users/workspaces in the
  // same browser tab lineage (e.g. switching workspaces client-side).
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Prefetched/cached canvas data shouldn't refetch on every
            // remount or window refocus — that would quietly reintroduce
            // the exact round-trips this was built to avoid. A project doc
            // is workspace-shared (another member could edit it), so this
            // is a deliberate trade-off in favor of fewer requests; a
            // user's own edits still invalidate their own view instantly.
            staleTime: 60_000,
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <div className="relative h-screen w-screen overflow-hidden bg-[#1e1f20] text-[#e8eaed] font-sans">
        <CanvasShell
          slug={slug}
          initialLayout={initialLayout}
          columns={columns}
          canWrite={canWrite}
          initialProjectSummaries={initialProjectSummaries}
          initialGmailStatus={initialGmailStatus}
          initialGmailMessages={initialGmailMessages}
        />
        <CanvasChrome />
      </div>
      {process.env.NODE_ENV === "development" && <ReactQueryDevtools initialIsOpen={false} />}
    </QueryClientProvider>
  );
}
