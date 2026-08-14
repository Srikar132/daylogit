"use client";

import { Copy, FolderInput } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";

interface MoveDuplicateDialogProps {
  imageCount: number;
  groupName: string;
  onMove: () => void;
  onDuplicate: () => void;
  onOpenChange: (open: boolean) => void;
}

/** Shown when a photo (or a multi-selection) is dropped onto a sidebar group
 *  — dnd-kit only tells us WHERE it landed, not whether the user meant to
 *  relocate it or keep the original and branch a copy, so we ask. Duplicate
 *  only applies to a single-image drop (no bulk-duplicate action exists). */
export function MoveDuplicateDialog({ imageCount, groupName, onMove, onDuplicate, onOpenChange }: MoveDuplicateDialogProps) {
  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent className="w-[90vw] max-w-sm rounded-2xl border border-white/[0.08] bg-[#131314] p-5 shadow-2xl">
        <DialogTitle className="text-[14px] text-[#e8eaed]">
          {imageCount > 1 ? `Move ${imageCount} photos` : "Move photo"} to &quot;{groupName}&quot;?
        </DialogTitle>
        <DialogDescription className="mt-1.5 text-[12.5px] text-[#9aa0a6]">
          Move takes {imageCount > 1 ? "them" : "it"} out of the current group.
          {imageCount === 1 && " Duplicate keeps the original in place and adds a copy instead."}
        </DialogDescription>
        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="rounded-full px-3 py-1.5 text-[12.5px] text-[#9aa0a6] hover:bg-white/10 cursor-pointer"
          >
            Cancel
          </button>
          {imageCount === 1 && (
            <button
              type="button"
              onClick={onDuplicate}
              className="flex items-center gap-1.5 rounded-full bg-white/[0.06] px-3 py-1.5 text-[12.5px] text-[#e8eaed] hover:bg-white/10 cursor-pointer"
            >
              <Copy className="h-3.5 w-3.5" /> Duplicate
            </button>
          )}
          <button
            type="button"
            onClick={onMove}
            className="flex items-center gap-1.5 rounded-full bg-[#8ab4f8] px-3 py-1.5 text-[12.5px] font-semibold text-[#141414] hover:bg-[#a6c8ff] cursor-pointer"
          >
            <FolderInput className="h-3.5 w-3.5" /> Move
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
