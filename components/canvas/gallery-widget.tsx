"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { AlertCircle, ChevronRight, Images, Trash2 } from "lucide-react";
import { motion } from "framer-motion";
import Link from "next/link";
import { useState } from "react";
import { useCanvasActions } from "@/components/canvas/canvas-actions-context";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger } from "@/components/ui/context-menu";
import { createAlbumAction, deleteAlbumAction, getAlbumPreview, type AlbumPreview } from "@/lib/actions/albums";
import { unwrapAction } from "@/lib/query-utils";

interface GalleryWidgetProps {
  id: string;
  albumId?: string;
  slug?: string;
  canWrite: boolean;
  /** Server-prefetched (batched for every gallery widget on the canvas at
   *  once, see app/workspace/[slug]/page.tsx) — same precedent as
   *  ProjectDocWidget's initialSummary. Absent for a card created after
   *  that prefetch ran; the query just fetches normally in that case. */
  initialPreview?: AlbumPreview;
}

export function GalleryWidget({ id, albumId, slug, canWrite, initialPreview }: GalleryWidgetProps) {
  if (!albumId) {
    return <DraftAlbumForm id={id} canWrite={canWrite} />;
  }
  return <GalleryCard id={id} albumId={albumId} slug={slug} canWrite={canWrite} initialPreview={initialPreview} />;
}

/** Same "starts as an inline form, becomes the card on submit" shape as
 *  ProjectDocWidget/BookmarkWidget — no modal, no separate creation step. */
function DraftAlbumForm({ id, canWrite }: { id: string; canWrite: boolean }) {
  const { updateWidgetData, deleteWidget } = useCanvasActions();
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);

  const createMutation = useMutation({
    mutationFn: (albumName: string) => unwrapAction(createAlbumAction(albumName)),
    onSuccess: (res) => updateWidgetData(id, { albumId: res.id }),
    onError: (err) => setError(err.message),
  });

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    if (!name.trim()) {
      setError("Give the album a name.");
      return;
    }
    createMutation.mutate(name.trim());
  }

  return (
    <form onSubmit={handleSubmit} className="nodrag nowheel flex h-full flex-col gap-2.5 overflow-y-auto scrollbar-thin p-3.5">
      <div className="flex items-center gap-2">
        <Images className="h-4 w-4 shrink-0 text-[#8ab4f8]" />
        <span className="text-[12.5px] font-medium text-[#e8eaed]">New Gallery</span>
      </div>

      {error && (
        <div className="flex items-center gap-1.5 rounded-lg border border-[#f28b82]/20 bg-[#f28b82]/10 px-2.5 py-1.5 text-[11.5px] text-[#f28b82]">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <Input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Album name"
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
          disabled={createMutation.isPending}
          className="rounded-full bg-[#8ab4f8] px-4 py-1.5 text-[12px] font-semibold text-[#141414] shadow-md transition-transform hover:bg-[#a6c8ff] active:scale-95 disabled:opacity-60 cursor-pointer"
        >
          {createMutation.isPending ? "Creating…" : "Create"}
        </button>
      </div>
    </form>
  );
}

// Back-to-front: position 0 renders first (furthest back), position 2 last
// (frontmost, flattest) — the "photos peeking out of a pocket" look.
const FAN_TRANSFORMS = [
  { rotate: 9, x: 26 },
  { rotate: -7, x: -22 },
  { rotate: 1, x: 2 },
];

// A flat pocket shape with a shallow valley notch at top-center — where the
// fanned photos poke through — rising back up to rounded shoulders at each
// top corner. Stretches to fill the card (preserveAspectRatio="none").
const POCKET_PATH =
  "M0,100 L0,26 C0,12 10,4 24,6 C55,10 78,34 100,34 C122,34 145,10 176,6 C190,4 200,12 200,26 L200,100 Z";

function GalleryCard({
  id,
  albumId,
  slug,
  canWrite,
  initialPreview,
}: {
  id: string;
  albumId: string;
  slug?: string;
  canWrite: boolean;
  initialPreview?: AlbumPreview;
}) {
  const { deleteWidget } = useCanvasActions();
  const {
    data: preview,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["albumPreview", albumId],
    queryFn: () => getAlbumPreview(albumId),
    initialData: initialPreview,
  });

  const deleteMutation = useMutation({
    mutationFn: () => unwrapAction(deleteAlbumAction(albumId)),
    onSuccess: () => deleteWidget(id),
    onError: (err) => console.error("Failed to delete gallery:", err),
  });

  function handleDeleteGallery() {
    if (!window.confirm("Delete this gallery and all its photos? This can't be undone.")) return;
    deleteMutation.mutate();
  }

  if (isLoading) {
    return (
      <div className="flex h-full flex-col gap-3 p-4">
        <Skeleton className="h-28 w-full rounded-2xl" />
        <Skeleton className="h-3.5 w-2/5" />
        <Skeleton className="mt-auto h-8 w-8 rounded-full" />
      </div>
    );
  }

  if (isError || !preview) {
    return (
      <div className="flex h-full items-center justify-center gap-1.5 p-4 text-center text-[12px] text-[#f28b82]">
        <AlertCircle className="h-3.5 w-3.5 shrink-0" />
        Couldn&apos;t load this gallery.
      </div>
    );
  }

  const { name, count, images } = preview;
  // Oldest-of-the-three first so it renders furthest back, matching
  // FAN_TRANSFORMS' back-to-front order — `images` itself is newest-first.
  const fanned = [...images].reverse();

  return (
    <ContextMenu>
      <ContextMenuTrigger className="block h-full rounded-2xl">
        <GalleryCardBody name={name} count={count} fanned={fanned} slug={slug} albumId={albumId} />
      </ContextMenuTrigger>
      <ContextMenuContent>
        {canWrite && (
          <ContextMenuItem destructive onClick={handleDeleteGallery}>
            <Trash2 className="h-3.5 w-3.5" /> Delete gallery
          </ContextMenuItem>
        )}
      </ContextMenuContent>
    </ContextMenu>
  );
}

function GalleryCardBody({
  name,
  count,
  fanned,
  slug,
  albumId,
}: {
  name: string;
  count: number;
  fanned: AlbumPreview["images"];
  slug?: string;
  albumId: string;
}) {
  return (
    <div className="flex h-full flex-col gap-3 rounded-2xl bg-[#1b1c1e] p-4">
      <div className="relative flex h-28 shrink-0 items-end justify-center overflow-hidden rounded-xl">
        <svg viewBox="0 0 200 100" preserveAspectRatio="none" className="absolute inset-0 h-full w-full text-[#26272a]">
          <path d={POCKET_PATH} fill="currentColor" />
        </svg>

        {fanned.length === 0 ? (
          <div className="relative z-10 mb-3 flex h-12 w-12 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.04] text-[#8a8f98]">
            <Images className="h-5 w-5" />
          </div>
        ) : (
          <div className="relative flex h-full w-full items-center justify-center">
            {fanned.map((img, i) => {
              const t = FAN_TRANSFORMS[FAN_TRANSFORMS.length - fanned.length + i] ?? FAN_TRANSFORMS[2];
              return (
                <motion.div
                  key={img.id}
                  initial={false}
                  whileHover={{ y: -4 }}
                  style={{ zIndex: i, rotate: t.rotate, x: t.x }}
                  className="absolute h-[74px] w-[54px] overflow-hidden rounded-md border-2 border-[#1b1c1e] shadow-md"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element -- arbitrary external Cloudinary domain */}
                  <img src={img.url} alt="" className="h-full w-full object-cover" />
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      <div className="flex min-w-0 items-end gap-2">
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-[14px] font-semibold text-[#e8eaed]">{name}</h3>
          <div className="mt-1 flex items-center gap-1 text-[11.5px] text-[#8a8f98]">
            <Images className="h-3 w-3 shrink-0" />
            <span>{count}</span>
          </div>
        </div>

        <Link
          href={slug ? `/workspace/${slug}/albums/${albumId}` : "#"}
          title="Open gallery"
          className="nodrag flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/[0.08] bg-white/[0.04] text-[#c8ccd2] shadow-sm transition-colors hover:border-white/[0.16] hover:bg-white/10 hover:text-[#e8eaed] cursor-pointer"
        >
          <ChevronRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}
