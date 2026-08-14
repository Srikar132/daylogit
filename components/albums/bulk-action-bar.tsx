"use client";

import { motion } from "framer-motion";
import { Download, FolderInput, Trash2, X } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useAlbumImageMutations } from "@/components/albums/use-album-image-mutations";
import type { AlbumGroupRow, AlbumImageRow } from "@/lib/actions/albums";

interface BulkActionBarProps {
  selectedIds: Set<string>;
  images: AlbumImageRow[];
  groups: AlbumGroupRow[];
  onClear: () => void;
  onDone: () => void;
}

export function BulkActionBar({ selectedIds, images, groups, onClear, onDone }: BulkActionBarProps) {
  const ids = [...selectedIds];
  const { bulkDelete, bulkMove } = useAlbumImageMutations(onDone);

  function handleDownload() {
    const selected = images.filter((img) => selectedIds.has(img.id));
    // Staggered — firing many downloads in the same tick gets a chunk of
    // them silently dropped by the browser's popup/download throttling.
    selected.forEach((img, i) => {
      setTimeout(() => {
        const a = document.createElement("a");
        a.href = img.url;
        a.download = img.name ?? "";
        a.target = "_blank";
        a.rel = "noopener noreferrer";
        document.body.appendChild(a);
        a.click();
        a.remove();
      }, i * 300);
    });
  }

  function handleDelete() {
    if (!window.confirm(`Delete ${ids.length} photo${ids.length > 1 ? "s" : ""}? This can't be undone.`)) return;
    bulkDelete.mutate(ids, { onSuccess: onClear });
  }

  function handleMove(groupId: string | null) {
    bulkMove.mutate({ ids, groupId }, { onSuccess: onClear });
  }

  return (
    <motion.div
      initial={{ y: 40, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 40, opacity: 0 }}
      className="pointer-events-none fixed inset-x-0 bottom-4 z-30 flex justify-center px-4"
    >
      <div className="pointer-events-auto flex items-center gap-2 rounded-full border border-white/[0.08] bg-[#131314] px-3 py-2 shadow-2xl">
        <span className="px-1.5 text-[12.5px] font-medium text-[#e8eaed]">{ids.length} selected</span>

        <DropdownMenu>
          <DropdownMenuTrigger className="flex items-center gap-1.5 rounded-full bg-white/[0.06] px-3 py-1.5 text-[12px] text-[#e8eaed] hover:bg-white/10 cursor-pointer">
            <FolderInput className="h-3.5 w-3.5" /> Move
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="max-h-64 overflow-y-auto">
            {groups.map((g) => (
              <DropdownMenuItem key={g.id} onClick={() => handleMove(g.id)}>
                {g.name}
              </DropdownMenuItem>
            ))}
            <DropdownMenuItem onClick={() => handleMove(null)}>Ungrouped</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <button
          type="button"
          onClick={handleDelete}
          className="flex items-center gap-1.5 rounded-full bg-[#f28b82]/10 px-3 py-1.5 text-[12px] text-[#f28b82] hover:bg-[#f28b82]/20 cursor-pointer"
        >
          <Trash2 className="h-3.5 w-3.5" /> Delete
        </button>

        <button
          type="button"
          onClick={handleDownload}
          className="hidden items-center gap-1.5 rounded-full bg-white/[0.06] px-3 py-1.5 text-[12px] text-[#e8eaed] hover:bg-white/10 cursor-pointer sm:flex"
        >
          <Download className="h-3.5 w-3.5" /> Download
        </button>

        <button
          type="button"
          onClick={onClear}
          title="Clear selection"
          className="flex h-7 w-7 items-center justify-center rounded-full text-[#9aa0a6] hover:bg-white/10 hover:text-[#e8eaed] cursor-pointer"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </motion.div>
  );
}
