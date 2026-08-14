"use client";

import { AlertCircle, Bookmark, ExternalLink, Loader2, RefreshCw, Trash2 } from "lucide-react";
import { useEffect, useRef, useState, useTransition } from "react";
import { useCanvasActions } from "@/components/canvas/canvas-actions-context";
import { Input } from "@/components/ui/input";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { getBookmarkMetadata, type BookmarkData } from "@/lib/actions/bookmarks";

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
  const [error, setError] = useState<string | null>(null);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    getBookmarkMetadata(url).then((res) => {
      if (res.error || !res.data) {
        setError(res.error ?? "Couldn't fetch that page.");
        return;
      }
      updateWidgetData(id, res.data);
    });
  }, [id, url, updateWidgetData]);

  return (
    <div className="nodrag flex h-full flex-col items-center justify-center gap-2 p-4 text-center">
      {error ? (
        <>
          <AlertCircle className="h-5 w-5 shrink-0 text-[#f28b82]" />
          <p className="text-[12px] text-[#f28b82]">{error}</p>
          <button
            type="button"
            onClick={() => deleteWidget(id)}
            className="rounded-full px-3 py-1 text-[11.5px] text-[#9aa0a6] hover:bg-white/5 hover:text-[#e8eaed] cursor-pointer"
          >
            Dismiss
          </button>
        </>
      ) : (
        <>
          <Loader2 className="h-5 w-5 shrink-0 animate-spin text-[#8ab4f8]" />
          <p className="text-[12px] text-[#9aa0a6]">Fetching preview…</p>
        </>
      )}
    </div>
  );
}

/** Same "starts as an inline form, becomes the card on submit" shape as
 *  ProjectDocWidget — no modal, no separate creation step. */
function DraftBookmarkForm({ id, canWrite }: { id: string; canWrite: boolean }) {
  const { updateWidgetData, deleteWidget } = useCanvasActions();
  const [url, setUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    if (!url.trim()) {
      setError("Paste a URL.");
      return;
    }

    startTransition(async () => {
      const res = await getBookmarkMetadata(url.trim());
      if (res.error || !res.data) {
        setError(res.error ?? "Couldn't fetch that page.");
        return;
      }
      updateWidgetData(id, res.data);
    });
  }

  return (
    <form onSubmit={handleSubmit} className="nodrag nowheel flex h-full flex-col gap-2.5 overflow-y-auto scrollbar-thin p-3.5">
      <div className="flex items-center gap-2">
        <Bookmark className="h-4 w-4 shrink-0 text-[#8ab4f8]" />
        <span className="text-[12.5px] font-medium text-[#e8eaed]">New Bookmark</span>
      </div>

      {error && (
        <div className="flex items-center gap-1.5 rounded-lg border border-[#f28b82]/20 bg-[#f28b82]/10 px-2.5 py-1.5 text-[11.5px] text-[#f28b82]">
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
        className="rounded-lg border-white/10 bg-white/5 px-2.5 py-1.5 text-[12.5px] text-[#e8eaed] placeholder:text-[#5f6368] focus-visible:ring-[#8ab4f8]"
      />

      <div className="mt-auto flex items-center justify-end gap-2 pt-1">
        {canWrite && (
          <button
            type="button"
            onClick={() => deleteWidget(id)}
            className="rounded-full px-3 py-1.5 text-[12px] text-[#9aa0a6] hover:bg-white/5 hover:text-[#e8eaed] cursor-pointer"
          >
            Cancel
          </button>
        )}
        <button
          type="submit"
          disabled={isPending}
          className="flex items-center gap-1.5 rounded-full bg-[#8ab4f8] px-4 py-1.5 text-[12px] font-semibold text-[#141414] shadow-md transition-transform hover:bg-[#a6c8ff] active:scale-95 disabled:opacity-60 cursor-pointer"
        >
          {isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          {isPending ? "Fetching…" : "Save"}
        </button>
      </div>
    </form>
  );
}

function BookmarkCard({ id, bookmark, canWrite }: { id: string; bookmark: BookmarkData; canWrite: boolean }) {
  const { updateWidgetData, deleteWidget } = useCanvasActions();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleRefresh() {
    setError(null);
    startTransition(async () => {
      const res = await getBookmarkMetadata(bookmark.url);
      if (res.error || !res.data) {
        setError(res.error ?? "Couldn't refresh this preview.");
        return;
      }
      updateWidgetData(id, res.data);
    });
  }

  return (
    <ContextMenu>
      <ContextMenuTrigger className="nodrag group flex h-full flex-col overflow-hidden">
        <a href={bookmark.url} target="_blank" rel="noopener noreferrer" className="flex h-full flex-col">
          <div className="relative aspect-[1.9/1] w-full shrink-0 overflow-hidden bg-white/[0.03]">
            {bookmark.image ? (
              // eslint-disable-next-line @next/next/no-img-element -- arbitrary external domain, next/image needs a fixed allowlist
              <img
                src={bookmark.image}
                alt=""
                className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-[1.03]"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-[#5f6368]">
                <Bookmark className="h-6 w-6" />
              </div>
            )}

            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleRefresh();
              }}
              disabled={isPending}
              title="Refresh preview"
              className="nodrag absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full border border-white/[0.1] bg-[#131314]/85 text-[#e8eaed] opacity-0 shadow-lg backdrop-blur-sm transition-opacity group-hover:opacity-100 hover:bg-[#131314] cursor-pointer disabled:opacity-60"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isPending ? "animate-spin" : ""}`} />
            </button>
          </div>

          <div className="flex min-h-0 flex-1 flex-col gap-1 p-3">
            {error && (
              <div className="flex items-center gap-1.5 text-[11px] text-[#f28b82]">
                <AlertCircle className="h-3 w-3 shrink-0" />
                <span className="truncate">{error}</span>
              </div>
            )}
            <h3 className="line-clamp-2 text-[13px] font-semibold text-[#e8eaed]">{bookmark.title}</h3>
            {bookmark.description && (
              <p className="line-clamp-2 text-[11.5px] leading-snug text-[#9aa0a6]">{bookmark.description}</p>
            )}
            <div className="mt-auto flex items-center gap-1.5 pt-1 text-[11px] text-[#5f6368]">
              {bookmark.favicon && (
                // eslint-disable-next-line @next/next/no-img-element -- arbitrary external domain, next/image needs a fixed allowlist
                <img src={bookmark.favicon} alt="" className="h-3.5 w-3.5 shrink-0 rounded-sm" />
              )}
              <span className="truncate">{bookmark.siteName || new URL(bookmark.url).hostname}</span>
              <ExternalLink className="h-3 w-3 shrink-0 opacity-0 transition-opacity group-hover:opacity-100" />
            </div>
          </div>
        </a>
      </ContextMenuTrigger>
      <ContextMenuContent>
        <ContextMenuItem onClick={handleRefresh}>
          <RefreshCw className="h-3.5 w-3.5" /> Refresh preview
        </ContextMenuItem>
        {canWrite && (
          <ContextMenuItem destructive onClick={() => deleteWidget(id)}>
            <Trash2 className="h-3.5 w-3.5" /> Delete
          </ContextMenuItem>
        )}
      </ContextMenuContent>
    </ContextMenu>
  );
}
