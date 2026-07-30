"use client";

import { Pencil, Trash2 } from "lucide-react";
import { useState, useTransition } from "react";
import { EditEntryModal } from "@/components/edit-entry-modal";
import { deleteEntryAction } from "@/lib/actions";
import type { EntryRow } from "@/lib/worklog";

interface RowActionsProps {
  entry: EntryRow;
}

export function RowActions({ entry }: RowActionsProps) {
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    if (!window.confirm("Are you sure you want to delete this log entry?")) {
      return;
    }
    const formData = new FormData();
    formData.append("id", entry.id);

    startTransition(async () => {
      await deleteEntryAction(formData);
    });
  }

  return (
    <>
      <div className="flex items-center justify-end gap-1 opacity-80 transition-opacity group-hover:opacity-100">
        <button
          type="button"
          onClick={() => setIsEditOpen(true)}
          disabled={isPending}
          aria-label="Edit entry"
          className="rounded-lg p-1.5 text-[#9aa0a6] transition-colors hover:bg-[#8ab4f8]/10 hover:text-[#8ab4f8] focus:outline-none"
        >
          <Pencil className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={handleDelete}
          disabled={isPending}
          aria-label="Delete entry"
          className="rounded-lg p-1.5 text-[#9aa0a6] transition-colors hover:bg-[#f28b82]/10 hover:text-[#f28b82] focus:outline-none"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>

      <EditEntryModal
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        entry={entry}
      />
    </>
  );
}
