"use client";

import { X, Sparkles, AlertCircle } from "lucide-react";
import { useEffect, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { createEntryAction, updateEntryAction } from "@/lib/actions";
import type { EntryRow } from "@/lib/worklog";

interface EditEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  entry?: EntryRow | null;
}

export function EditEntryModal({
  isOpen,
  onClose,
  entry,
}: EditEntryModalProps) {
  const isEditing = Boolean(entry);
  const [title, setTitle] = useState(entry?.title ?? "");
  const [summary, setSummary] = useState(entry?.summary ?? "");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (isOpen) {
      setTitle(entry?.title ?? "");
      setSummary(entry?.summary ?? "");
      setError(null);
    }
  }, [isOpen, entry]);

  if (!isOpen) return null;

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    if (!summary.trim() || summary.trim().length < 5) {
      setError("Please provide a summary (at least 5 characters).");
      return;
    }

    const formData = new FormData();
    if (isEditing && entry?.id) formData.append("id", entry.id);
    if (title.trim()) formData.append("title", title.trim());
    formData.append("summary", summary.trim());

    startTransition(async () => {
      const res = isEditing
        ? await updateEntryAction({}, formData)
        : await createEntryAction({}, formData);

      if (res.error) {
        setError(res.error);
      } else {
        onClose();
      }
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/75 backdrop-blur-md transition-opacity animate-in fade-in"
        onClick={onClose}
      />

      {/* Modal Container */}
      <div className="relative w-full max-w-lg overflow-hidden rounded-3xl border border-white/10 bg-[#1e1e1e] p-6 sm:p-8 shadow-2xl transition-all animate-in zoom-in-95">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-white/8 pb-5">
          <div className="flex items-center gap-3 pr-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#8ab4f8]/10 text-[#8ab4f8] shadow-inner">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-[18px] font-bold text-[#e8eaed]">
                {isEditing ? "Edit Work Log" : "Create Work Log"}
              </h2>
              <p className="text-[12.5px] text-[#9aa0a6]">
                {isEditing
                  ? "Refine your log title and details"
                  : "Record your latest log entry"}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[#9aa0a6] transition-all hover:bg-white/10 hover:text-white"
          >
            <X className="h-4.5 w-4.5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-5">
          {/* Error Banner */}
          {error && (
            <div className="flex items-center gap-2.5 rounded-2xl border border-[#f28b82]/20 bg-[#f28b82]/10 p-4 text-[13px] text-[#f28b82]">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Title Input */}
          <div className="space-y-1.5">
            <label className="block text-[12px] font-semibold uppercase tracking-wider text-[#9aa0a6]">
              Title (Optional)
            </label>
            <Input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Completed API integration"
              className="rounded-2xl border-white/10 bg-white/5 px-4 py-2.5 text-[13.5px] text-[#e8eaed] placeholder:text-[#5f6368] focus-visible:ring-[#8ab4f8]"
            />
          </div>

          {/* Summary Textarea */}
          <div className="space-y-1.5">
            <label className="block text-[12px] font-semibold uppercase tracking-wider text-[#9aa0a6]">
              Details / Summary
            </label>
            <Textarea
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder="Summary of work done today..."
              rows={4}
              required
              minLength={5}
              className="resize-none rounded-2xl border-white/10 bg-white/5 p-4 text-[13.5px] leading-relaxed text-[#e8eaed] placeholder:text-[#5f6368] focus-visible:ring-[#8ab4f8] focus-visible:ring-1"
            />
          </div>

          {/* Footer Actions */}
          <div className="mt-2 flex items-center justify-end gap-3 border-t border-white/8 pt-5">
            <Button
              type="button"
              variant="ghost"
              onClick={onClose}
              className="h-10 rounded-full px-5 text-[13px] text-[#9aa0a6] hover:bg-white/5 hover:text-[#e8eaed]"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isPending}
              className="h-10 rounded-full bg-[#8ab4f8] px-6 text-[13px] font-semibold text-[#141414] shadow-md hover:bg-[#a6c8ff] transition-transform active:scale-95"
            >
              {isPending
                ? "Saving..."
                : isEditing
                ? "Save Changes"
                : "Create Work Log"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
