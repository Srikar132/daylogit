"use client";

import { useMutation } from "@tanstack/react-query";
import { AlertCircle, Bookmark, Loader2, RefreshCw, Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useCanvasActions } from "@/components/canvas/canvas-actions-context";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { getBookmarkMetadata, type BookmarkData } from "@/lib/actions/bookmarks";
import { unwrapAction } from "@/lib/query-utils";

interface BookmarkWidgetProps {
  id: string;
  canWrite: boolean;
  widgetData?: Record<string, unknown>;
}

function asBookmarkData(data: Record<string, unknown> | undefined): BookmarkData | undefined {
  if (!data || typeof data.url !== "string" || typeof data.title !== "string") return undefined;
  return data as BookmarkData;
}

export function BookmarkWidget({ id, canWrite, widgetData }: BookmarkWidgetProps) {
  const bookmark = asBookmarkData(widgetData);
  const pendingUrl = !bookmark && typeof widgetData?.pendingUrl === "string" ? widgetData.pendingUrl : undefined;

  if (pendingUrl) {
    return <PendingBookmark id={id} url={pendingUrl} />;
  }
  if (!bookmark) {
    return <DraftBookmarkForm id={id} canWrite={canWrite} />;
  }
  return <BookmarkCard id={id} bookmark={bookmark} canWrite={canWrite} />;
}

/** Pasting a bare URL onto the canvas creates a widget straight in this
 *  state (see canvas-shell.tsx's paste handler) — no form, fetch starts
 *  immediately, and the result replaces `pendingUrl` with the real
 *  bookmark data once it resolves. */
function PendingBookmark({ id, url }: { id: string; url: string }) {
  const { updateWidgetData, deleteWidget } = useCanvasActions();
  const started = useRef(false);

  const fetchMutation = useMutation({
    mutationFn: (targetUrl: string) => unwrapAction(getBookmarkMetadata(targetUrl)),
    onSuccess: (res) => {
      if (res.data) updateWidgetData(id, res.data);
    },
  });

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    fetchMutation.mutate(url);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url]);

  const error = fetchMutation.error?.message;

  if (error) {
    return (
      <div className="nodrag widget-card-shell flex h-full flex-col items-center justify-center gap-2 p-4 text-center">
        <AlertCircle className="h-5 w-5 shrink-0 text-destructive" />
        <p className="text-[12px] text-destructive">{error}</p>
        <button
          type="button"
          onClick={() => deleteWidget(id)}
          className="rounded-full px-3 py-1 text-[11.5px] text-widget-text-secondary hover:bg-white/5 hover:text-widget-text-primary cursor-pointer"
        >
          Dismiss
        </button>
      </div>
    );
  }

  // Shaped like the actual BookmarkCard it's about to become (icon band +
  // title/url lines) rather than a generic spinner, so the layout doesn't
  // visibly jump once the real preview lands.
  return (
    <div className="nodrag widget-card-shell flex h-full items-stretch overflow-hidden">
      <div className="flex w-[30%] shrink-0 items-center justify-center border-r border-widget-border bg-widget-surface">
        <Skeleton className="h-8 w-8 rounded-md bg-white/10" />
      </div>
      <div className="flex min-w-0 flex-1 flex-col justify-between gap-2 p-4">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-3.5 w-3/5 bg-white/10" />
          <Skeleton className="h-3 w-4/5 bg-white/10" />
        </div>
        <Skeleton className="h-2.5 w-2/5 bg-white/10" />
      </div>
    </div>
  );
}

/** Same "starts as an inline form, becomes the card on submit" shape as
 *  ProjectDocWidget — no modal, no separate creation step. */
function DraftBookmarkForm({ id, canWrite }: { id: string; canWrite: boolean }) {
  const { updateWidgetData, deleteWidget } = useCanvasActions();
  const [url, setUrl] = useState("");
  const [error, setError] = useState<string | null>(null);

  const fetchMutation = useMutation({
    mutationFn: (targetUrl: string) => unwrapAction(getBookmarkMetadata(targetUrl)),
    onSuccess: (res) => {
      if (res.data) updateWidgetData(id, res.data);
    },
    onError: (err) => setError(err.message),
  });

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    if (!url.trim()) {
      setError("Paste a URL.");
      return;
    }
    fetchMutation.mutate(url.trim());
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="nodrag nowheel widget-card-shell flex h-full flex-col gap-2.5 overflow-y-auto scrollbar-thin p-3.5"
    >
      <div className="flex items-center gap-2">
        <Bookmark className="h-4 w-4 shrink-0 text-zinc-300" />
        <span className="text-[12.5px] font-medium text-widget-text-primary">New Bookmark</span>
      </div>

      {error && (
        <div className="flex items-center gap-1.5 rounded-lg border border-destructive/20 bg-destructive/10 px-2.5 py-1.5 text-[11.5px] text-destructive">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <Input
        type="text"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        placeholder="https://…"
        autoFocus
        className="rounded-xl border-widget-border bg-widget-surface px-2.5 py-1.5 text-[12.5px] text-widget-text-primary placeholder:text-widget-text-muted focus-visible:ring-white/30"
      />

      <div className="mt-auto flex items-center justify-end gap-2 pt-1">
        {canWrite && (
          <button
            type="button"
            onClick={() => deleteWidget(id)}
            className="rounded-full px-3 py-1.5 text-[12px] text-widget-text-secondary hover:bg-white/5 hover:text-widget-text-primary cursor-pointer"
          >
            Cancel
          </button>
        )}
        <button
          type="submit"
          disabled={fetchMutation.isPending}
          className="widget-btn-primary flex items-center gap-1.5 px-4 py-1.5 text-[12px] disabled:opacity-60 cursor-pointer"
        >
          {fetchMutation.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          {fetchMutation.isPending ? "Fetching…" : "Save"}
        </button>
      </div>
    </form>
  );
}

function BookmarkCard({ id, bookmark, canWrite }: { id: string; bookmark: BookmarkData; canWrite: boolean }) {
  const { updateWidgetData, deleteWidget } = useCanvasActions();
  const [error, setError] = useState<string | null>(null);
  const [iconFailed, setIconFailed] = useState(false);

  const refreshMutation = useMutation({
    mutationFn: () => unwrapAction(getBookmarkMetadata(bookmark.url)),
    onSuccess: (res) => {
      if (res.data) {
        setIconFailed(false);
        updateWidgetData(id, res.data);
      }
    },
    onError: (err) => setError(err.message),
  });

  function handleRefresh() {
    setError(null);
    refreshMutation.mutate();
  }

  const hasIcon = bookmark.favicon && !iconFailed;

  return (
    <ContextMenu>
      {/* The icon band is a plain div, not part of the link — it's the card's
          drag handle. If it were inside the <a>, the entire card would be one
          giant link with nowhere left to grab-and-hold to reposition it (see
          widget-node.tsx: alwaysInteractive widgets aren't `nodrag`'d, so
          whatever part of the body ISN'T a link/button is a valid drag
          surface). `nodrag` on the <a> itself keeps clicking the link from
          racing against that same drag gesture. */}
      <ContextMenuTrigger className="group relative widget-card-shell flex h-full items-stretch overflow-hidden">
        {/* Icon band takes the full card height, not just its own row — a
            fixed 30% width column rather than a small inline square. */}
        <div className="flex w-[30%] shrink-0 items-center justify-center overflow-hidden rounded-l-2xl border-r border-widget-border bg-widget-surface">
          {hasIcon ? (
            // eslint-disable-next-line @next/next/no-img-element -- arbitrary external domain, next/image needs a fixed allowlist
            <img
              src={bookmark.favicon}
              alt=""
              onError={() => setIconFailed(true)}
              className="h-8 w-8 object-contain"
            />
          ) : (
            <Bookmark className="h-6 w-6 text-zinc-300" />
          )}
        </div>

        {/* Title/description fill whatever space they need (ellipsized), url
            is pinned to the bottom via mt-auto regardless of how much text
            sits above it. */}
        <a
          href={bookmark.url}
          target="_blank"
          rel="noopener noreferrer"
          draggable={false}
          className="nodrag flex min-w-0 flex-1 flex-col justify-between gap-2 p-4"
        >
          <div className="min-w-0">
            {error && (
              <div className="mb-1 flex items-center gap-1.5 text-[11px] text-destructive">
                <AlertCircle className="h-3 w-3 shrink-0" />
                <span className="truncate">{error}</span>
              </div>
            )}
            <h3 className="truncate pr-6 text-[14px] font-semibold text-widget-text-primary">{bookmark.title}</h3>
            {bookmark.description && (
              <p className="mt-1 line-clamp-2 text-[12.5px] leading-snug text-widget-text-secondary">{bookmark.description}</p>
            )}
          </div>
          <p className="mt-auto truncate text-[11.5px] font-mono text-zinc-400 group-hover:text-zinc-300 transition-colors">{bookmark.url}</p>
        </a>

        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            handleRefresh();
          }}
          disabled={refreshMutation.isPending}
          title="Refresh preview"
          className="nodrag absolute right-3 top-3 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-widget-text-secondary opacity-0 transition-opacity group-hover:opacity-100 hover:bg-white/10 hover:text-widget-text-primary cursor-pointer disabled:opacity-60"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${refreshMutation.isPending ? "animate-spin" : ""}`} />
        </button>
      </ContextMenuTrigger>
      <ContextMenuContent>
        <ContextMenuItem onClick={handleRefresh}>
          <RefreshCw className="h-3.5 w-3.5" /> Refresh preview
        </ContextMenuItem>
        {canWrite && (
          <ContextMenuItem variant="destructive" onClick={() => deleteWidget(id)}>
            <Trash2 className="h-3.5 w-3.5" /> Delete
          </ContextMenuItem>
        )}
      </ContextMenuContent>
    </ContextMenu>
  );
}
