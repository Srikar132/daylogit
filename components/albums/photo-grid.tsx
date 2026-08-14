"use client";

import { motion } from "framer-motion";
import { AlertCircle, Copy, Download, FolderInput, ImageOff, MoreHorizontal, Pencil, Trash2, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import type { PendingUpload } from "@/components/albums/use-album-upload";
import { useAlbumImageMutations } from "@/components/albums/use-album-image-mutations";
import type { AlbumGroupRow, AlbumImageRow } from "@/lib/actions/albums";

interface PhotoGridProps {
  images: AlbumImageRow[];
  pendingUploads: PendingUpload[];
  onDismissPending: (id: string) => void;
  selectedIds: Set<string>;
  canWrite: boolean;
  onToggleSelect: (id: string) => void;
  onOpenLightbox: (index: number) => void;
  hasMore: boolean;
  loadingMore: boolean;
  onLoadMore: () => void;
  groups: AlbumGroupRow[];
  onRefresh: () => void;
  /** True while a group-filter switch's fetch is in flight — shows skeleton
   *  tiles instead of a jarring blank grid between filters. */
  isSwitching: boolean;
}

export function PhotoGrid({
  images,
  pendingUploads,
  onDismissPending,
  selectedIds,
  canWrite,
  onToggleSelect,
  onOpenLightbox,
  hasMore,
  loadingMore,
  onLoadMore,
  groups,
  onRefresh,
  isSwitching,
}: PhotoGridProps) {
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!hasMore) return;
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) onLoadMore();
      },
      { rootMargin: "400px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasMore, images.length]);

  if (isSwitching) {
    return (
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7">
        {Array.from({ length: 12 }).map((_, i) => (
          <Skeleton key={i} className="aspect-square rounded-2xl" />
        ))}
      </div>
    );
  }

  if (images.length === 0 && pendingUploads.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/[0.06] bg-white/[0.03] text-[#5f6368]">
          <ImageOff className="h-6 w-6" />
        </div>
        <div>
          <p className="text-[13px] text-[#9aa0a6]">No photos here yet.</p>
          {canWrite && <p className="mt-0.5 text-[12px] text-[#5f6368]">Drop images anywhere or use &quot;Add photos&quot; above.</p>}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7">
        {pendingUploads.map((p) => (
          <PendingTile key={p.id} pending={p} onDismiss={() => onDismissPending(p.id)} />
        ))}
        {images.map((img, i) => (
          <PhotoTile
            key={img.id}
            image={img}
            selected={selectedIds.has(img.id)}
            selectionActive={selectedIds.size > 0}
            canWrite={canWrite}
            groups={groups}
            onToggleSelect={() => onToggleSelect(img.id)}
            onOpen={() => onOpenLightbox(i)}
            onChanged={onRefresh}
          />
        ))}
      </div>
      {hasMore && (
        <div ref={sentinelRef} className="flex h-16 items-center justify-center text-[12px] text-[#5f6368]">
          {loadingMore ? "Loading more…" : ""}
        </div>
      )}
    </div>
  );
}

function PendingTile({ pending, onDismiss }: { pending: PendingUpload; onDismiss: () => void }) {
  return (
    <div className="relative flex aspect-square flex-col items-center justify-center gap-2 rounded-2xl border border-white/[0.06] bg-[#131314] p-3 text-center">
      {pending.error ? (
        <>
          <AlertCircle className="h-4 w-4 shrink-0 text-[#f28b82]" />
          <p className="text-[11px] text-[#f28b82]">{pending.error}</p>
          <button
            type="button"
            onClick={onDismiss}
            className="absolute right-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-full text-[#9aa0a6] hover:bg-white/10 hover:text-[#e8eaed] cursor-pointer"
          >
            <X className="h-3 w-3" />
          </button>
        </>
      ) : (
        <>
          <div className="h-1 w-3/5 overflow-hidden rounded-full bg-white/[0.08]">
            <div className="h-full rounded-full bg-[#8ab4f8] transition-[width] duration-150" style={{ width: `${pending.progress}%` }} />
          </div>
          <p className="text-[11px] text-[#9aa0a6]">Uploading… {pending.progress}%</p>
        </>
      )}
    </div>
  );
}

function PhotoTile({
  image,
  selected,
  selectionActive,
  canWrite,
  groups,
  onToggleSelect,
  onOpen,
  onChanged,
}: {
  image: AlbumImageRow;
  selected: boolean;
  selectionActive: boolean;
  canWrite: boolean;
  groups: AlbumGroupRow[];
  onToggleSelect: () => void;
  onOpen: () => void;
  onChanged: () => void;
}) {
  const [renaming, setRenaming] = useState(false);
  const [name, setName] = useState(image.name ?? "");
  const { rename, duplicate, remove, move } = useAlbumImageMutations(onChanged);

  async function copyLink() {
    await navigator.clipboard.writeText(image.url);
  }

  function download() {
    const a = document.createElement("a");
    a.href = image.url;
    a.download = image.name ?? "";
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  function handleClick() {
    if (selectionActive) onToggleSelect();
    else onOpen();
  }

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      transition={{ type: "spring", stiffness: 400, damping: 30 }}
      className="group relative aspect-square overflow-hidden rounded-2xl border border-white/[0.06] bg-[#131314] shadow-sm transition-shadow hover:shadow-lg hover:shadow-black/30"
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- arbitrary external Cloudinary domain */}
      <img
        src={image.url}
        alt={image.name ?? ""}
        onClick={handleClick}
        className="h-full w-full cursor-pointer object-cover"
      />

      <div
        className={`pointer-events-none absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent transition-opacity ${
          selected ? "opacity-100" : "opacity-0 group-hover:opacity-100"
        }`}
      />

      <div className="absolute left-2 top-2">
        <Checkbox
          checked={selected}
          onCheckedChange={onToggleSelect}
          onClick={(e) => e.stopPropagation()}
          className={`bg-black/40 backdrop-blur-sm transition-opacity ${
            selected || selectionActive ? "opacity-100" : "opacity-0 group-hover:opacity-100"
          }`}
        />
      </div>

      {canWrite && (
        <div className="absolute right-2 top-2 opacity-0 transition-opacity group-hover:opacity-100">
          <DropdownMenu>
            <DropdownMenuTrigger
              onClick={(e) => e.stopPropagation()}
              className="flex h-6 w-6 items-center justify-center rounded-full bg-black/50 text-white hover:bg-black/70 cursor-pointer"
            >
              <MoreHorizontal className="h-3.5 w-3.5" />
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => setRenaming(true)}>
                <Pencil className="h-3.5 w-3.5" /> Rename
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => duplicate.mutate({ id: image.id })}>
                <FolderInput className="h-3.5 w-3.5" /> Duplicate
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => void copyLink()}>
                <Copy className="h-3.5 w-3.5" /> Copy link
              </DropdownMenuItem>
              <DropdownMenuItem onClick={download}>
                <Download className="h-3.5 w-3.5" /> Download
              </DropdownMenuItem>
              {groups.length > 0 && (
                <>
                  <div className="my-1 h-px bg-white/[0.06]" />
                  {groups.map((g) => (
                    <DropdownMenuItem key={g.id} onClick={() => move.mutate({ id: image.id, groupId: g.id })}>
                      Move to {g.name}
                    </DropdownMenuItem>
                  ))}
                  <DropdownMenuItem onClick={() => move.mutate({ id: image.id, groupId: null })}>
                    Remove from group
                  </DropdownMenuItem>
                </>
              )}
              <div className="my-1 h-px bg-white/[0.06]" />
              <DropdownMenuItem
                destructive
                onClick={() => {
                  if (window.confirm("Delete this photo? This can't be undone.")) {
                    remove.mutate(image.id);
                  }
                }}
              >
                <Trash2 className="h-3.5 w-3.5" /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}

      {renaming && (
        <div className="absolute inset-x-0 bottom-0 bg-black/70 p-1.5">
          <input
            type="text"
            value={name}
            autoFocus
            onClick={(e) => e.stopPropagation()}
            onChange={(e) => setName(e.target.value)}
            onBlur={() => {
              setRenaming(false);
              rename.mutate({ id: image.id, name });
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") e.currentTarget.blur();
              if (e.key === "Escape") setRenaming(false);
            }}
            className="w-full rounded bg-white/10 px-1.5 py-1 text-[11.5px] text-white outline-none"
          />
        </div>
      )}

      {!renaming && image.name && (
        <div className="pointer-events-none absolute inset-x-0 bottom-0 truncate p-1.5 text-[11px] text-white opacity-0 transition-opacity group-hover:opacity-100">
          {image.name}
        </div>
      )}
    </motion.div>
  );
}
