"use client";

import { Pencil, Trash2 } from "lucide-react";
import { useState } from "react";
import { DeleteConfirmModal } from "@/components/delete-confirm-modal";
import { EditEntryModal } from "@/components/edit-entry-modal";
import type { EntryRow } from "@/lib/worklog";

interface RowActionsProps {
  entry: EntryRow;
}

export function RowActions({ entry }: RowActionsProps) {
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  return (
    <>
      <div className="flex items-center justify-end gap-1 opacity-80 transition-opacity group-hover:opacity-100">
        <button
          type="button"
          onClick={() => setIsEditOpen(true)}
          aria-label="Edit entry"
          className="rounded-lg p-1.5 text-[#9aa0a6] transition-colors hover:bg-[#8ab4f8]/10 hover:text-[#8ab4f8] focus:outline-none"
        >
          <Pencil className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={() => setIsDeleteOpen(true)}
          aria-label="Delete entry"
          className="rounded-lg p-1.5 text-[#9aa0a6] transition-colors hover:bg-[#f28b82]/10 hover:text-[#f28b82] focus:outline-none"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
      
      {/* Edit Entry Modal */}
      <EditEntryModal
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        entry={entry}
      />

      {/* Delete Confirmation Modal (Shadcn/Google Dark style dialog) */}
      <DeleteConfirmModal
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        entry={entry}
      />
    </>
  );
}
