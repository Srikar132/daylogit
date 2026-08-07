"use client";

import { AlertTriangle, X } from "lucide-react";
import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { deleteEntryAction } from "@/lib/actions";
import type { EntryRow } from "@/lib/worklog";

interface DeleteConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  entry: EntryRow;
}

export function DeleteConfirmModal({
  isOpen,
  onClose,
  entry,
}: DeleteConfirmModalProps) {
  const [isPending, startTransition] = useTransition();

  if (!isOpen) return null;

  function handleConfirmDelete() {
    const formData = new FormData();
    formData.append("id", entry.id);

    startTransition(async () => {
      await deleteEntryAction(formData);
      onClose();
    });
  }

  const previewText =
    entry.summary.length > 80
      ? `${entry.summary.slice(0, 80)}…`
      : entry.summary;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/75 backdrop-blur-md transition-opacity animate-in fade-in"
        onClick={onClose}
      />

      {/* Modal Card — Spacious Google Dark Style */}
      <div className="relative w-full max-w-md overflow-hidden rounded-3xl border border-white/10 bg-[#1e1e1e] p-6 sm:p-7 shadow-2xl transition-all animate-in zoom-in-95">
        {/* Top Right Close Button */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Close dialog"
          className="absolute right-5 top-5 flex h-8 w-8 items-center justify-center rounded-full text-[#9aa0a6] transition-all hover:bg-white/10 hover:text-white"
        >
          <X className="h-4.5 w-4.5" />
        </button>

        {/* Warning Icon Badge */}
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#f28b82]/15 text-[#f28b82] shadow-inner">
          <AlertTriangle className="h-6 w-6 stroke-[2.2]" />
        </div>

        {/* Title & Description */}
        <div className="space-y-1.5 pr-6">
          <h2 className="text-[19px] font-bold text-[#e8eaed]">
            Delete Log Entry?
          </h2>
          <p className="text-[13px] leading-relaxed text-[#9aa0a6]">
            Are you sure you want to delete this activity log? This item will be permanently hidden from your dashboard.
          </p>
        </div>

        {/* Entry Preview Box */}
        <div className="my-5 rounded-2xl border border-white/8 bg-white/5 p-4 space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#8ab4f8]">
              {entry.title || "Log Entry"}
            </span>
            <span className="text-[11px] font-medium text-[#5f6368]">
              {entry.date}
            </span>
          </div>
          <p className="text-[13px] leading-relaxed text-[#c4c7c5] line-clamp-2">
            {previewText}
          </p>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-3 pt-1">
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            disabled={isPending}
            className="h-10 rounded-full px-5 text-[13px] text-[#9aa0a6] hover:bg-white/5 hover:text-[#e8eaed]"
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleConfirmDelete}
            disabled={isPending}
            className="h-10 rounded-full bg-[#f28b82] px-6 text-[13px] font-semibold text-[#141414] shadow-md hover:bg-[#f59e97] transition-transform active:scale-95"
          >
            {isPending ? "Deleting..." : "Delete Entry"}
          </Button>
        </div>
      </div>
    </div>
  );
}
