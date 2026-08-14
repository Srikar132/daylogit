"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, ChevronRight, Copy, Download, FolderInput, Pencil, Trash2, X } from "lucide-react";
import { useEffect, useState } from "react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useAlbumImageMutations } from "@/components/albums/use-album-image-mutations";
import type { AlbumGroupRow, AlbumImageRow } from "@/lib/actions/albums";

interface LightboxProps {
  images: AlbumImageRow[];
  index: number;
  groups: AlbumGroupRow[];
  canWrite: boolean;
  onClose: () => void;
  onIndexChange: (index: number) => void;
  onChanged: () => void;
}

export function Lightbox({ images, index, groups, canWrite, onClose, onIndexChange, onChanged }: LightboxProps) {
  const image = images[index];
  const { remove } = useAlbumImageMutations(onChanged);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft" && index > 0) onIndexChange(index - 1);
      if (e.key === "ArrowRight" && index < images.length - 1) onIndexChange(index + 1);
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [index, images.length, onClose, onIndexChange]);

  if (!image) return null;

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

  function handleDelete() {
    if (!window.confirm("Delete this photo? This can't be undone.")) return;
    remove.mutate(image.id, { onSuccess: onClose });
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex flex-col bg-black/92"
        onClick={onClose}
      >
        <div
          className="flex items-center justify-between border-b border-white/[0.06] p-3 sm:p-4"
          onClick={(e) => e.stopPropagation()}
        >
          <span className="truncate text-[12.5px] text-white/70">{image.name || `${index + 1} / ${images.length}`}</span>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full text-white/70 hover:bg-white/10 hover:text-white cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="relative flex min-h-0 flex-1 items-center justify-center px-4" onClick={(e) => e.stopPropagation()}>
          {index > 0 && (
            <button
              type="button"
              onClick={() => onIndexChange(index - 1)}
              className="absolute left-2 flex h-10 w-10 items-center justify-center rounded-full bg-black/40 text-white hover:bg-black/60 cursor-pointer sm:left-4"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
          )}

          <motion.img
            key={image.id}
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            src={image.url}
            alt={image.name ?? ""}
            className="max-h-full max-w-full rounded-lg object-contain shadow-2xl"
          />

          {index < images.length - 1 && (
            <button
              type="button"
              onClick={() => onIndexChange(index + 1)}
              className="absolute right-2 flex h-10 w-10 items-center justify-center rounded-full bg-black/40 text-white hover:bg-black/60 cursor-pointer sm:right-4"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          )}
        </div>

        {canWrite && (
          <LightboxActionBar
            key={image.id}
            image={image}
            groups={groups}
            onCopyLink={copyLink}
            onDownload={download}
            onDelete={handleDelete}
            onChanged={onChanged}
          />
        )}
      </motion.div>
    </AnimatePresence>
  );
}

/** Keyed by image.id in the parent — remounting on image change resets
 *  `renaming`/`name` for free, instead of syncing them via an effect. */
function LightboxActionBar({
  image,
  groups,
  onCopyLink,
  onDownload,
  onDelete,
  onChanged,
}: {
  image: AlbumImageRow;
  groups: AlbumGroupRow[];
  onCopyLink: () => void;
  onDownload: () => void;
  onDelete: () => void;
  onChanged: () => void;
}) {
  const [renaming, setRenaming] = useState(false);
  const [name, setName] = useState(image.name ?? "");
  const { rename, duplicate, move } = useAlbumImageMutations(onChanged);

  return (
    <div className="flex items-center justify-center gap-1.5 p-3 sm:p-4" onClick={(e) => e.stopPropagation()}>
      {renaming ? (
        <input
          type="text"
          value={name}
          autoFocus
          onChange={(e) => setName(e.target.value)}
          onBlur={() => {
            setRenaming(false);
            rename.mutate({ id: image.id, name });
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") e.currentTarget.blur();
            if (e.key === "Escape") setRenaming(false);
          }}
          className="w-48 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-[12.5px] text-white outline-none"
        />
      ) : (
        <>
          <LightboxAction icon={Pencil} label="Rename" onClick={() => setRenaming(true)} />
          <LightboxAction icon={FolderInput} label="Duplicate" onClick={() => duplicate.mutate({ id: image.id })} />
          <LightboxAction icon={Copy} label="Copy link" onClick={onCopyLink} />
          <LightboxAction icon={Download} label="Download" onClick={onDownload} />
          {groups.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger className="flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-[12px] text-white hover:bg-white/20 cursor-pointer">
                <FolderInput className="h-3.5 w-3.5" /> Move
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                {groups.map((g) => (
                  <DropdownMenuItem key={g.id} onClick={() => move.mutate({ id: image.id, groupId: g.id })}>
                    {g.name}
                  </DropdownMenuItem>
                ))}
                <DropdownMenuItem onClick={() => move.mutate({ id: image.id, groupId: null })}>
                  Ungrouped
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          <LightboxAction icon={Trash2} label="Delete" onClick={onDelete} destructive />
        </>
      )}
    </div>
  );
}

function LightboxAction({
  icon: Icon,
  label,
  onClick,
  destructive,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  onClick: () => void;
  destructive?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] cursor-pointer ${
        destructive ? "bg-[#f28b82]/15 text-[#f28b82] hover:bg-[#f28b82]/25" : "bg-white/10 text-white hover:bg-white/20"
      }`}
    >
      <Icon className="h-3.5 w-3.5" />
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}
