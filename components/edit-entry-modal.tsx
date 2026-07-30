"use client";

import { X, Sparkles, AlertCircle } from "lucide-react";
import { useEffect, useState, useTransition } from "react";
import { CategoryTag } from "@/components/category-tag";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { createEntryAction, updateEntryAction } from "@/lib/actions";
import {
  CATEGORIES,
  PROJECTS,
  type Category,
  type Project,
} from "@/lib/constants";
import type { EntryRow } from "@/lib/worklog";

interface EditEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  entry?: EntryRow | null;
  defaultProject?: Project;
}

export function EditEntryModal({
  isOpen,
  onClose,
  entry,
  defaultProject,
}: EditEntryModalProps) {
  const isEditing = Boolean(entry);
  const [selectedProject, setSelectedProject] = useState<Project>(
    (entry?.project as Project) ?? defaultProject ?? PROJECTS[0],
  );
  const [selectedCategories, setSelectedCategories] = useState<Category[]>(
    (entry?.category as Category[]) ?? [CATEGORIES[0]],
  );
  const [summary, setSummary] = useState(entry?.summary ?? "");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (isOpen) {
      setSelectedProject(
        (entry?.project as Project) ?? defaultProject ?? PROJECTS[0],
      );
      setSelectedCategories(
        (entry?.category as Category[]) ?? [CATEGORIES[0]],
      );
      setSummary(entry?.summary ?? "");
      setError(null);
    }
  }, [isOpen, entry, defaultProject]);

  if (!isOpen) return null;

  function toggleCategory(cat: Category) {
    setSelectedCategories((prev) => {
      if (prev.includes(cat)) {
        if (prev.length === 1) return prev; // Keep at least one
        return prev.filter((c) => c !== cat);
      }
      return [...prev, cat];
    });
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    if (!summary.trim() || summary.trim().length < 10) {
      setError("Please provide a detailed summary (at least 10 characters).");
      return;
    }

    const formData = new FormData();
    if (isEditing && entry?.id) formData.append("id", entry.id);
    formData.append("project", selectedProject);
    selectedCategories.forEach((cat) => formData.append("category", cat));
    formData.append("summary", summary);

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

      {/* Modal Container — Spacious & Modern */}
      <div className="relative w-full max-w-2xl overflow-hidden rounded-3xl border border-white/10 bg-[#1e1e1e] p-6 sm:p-8 shadow-2xl transition-all animate-in zoom-in-95">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/8 pb-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#8ab4f8]/10 text-[#8ab4f8] shadow-inner">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-[18px] font-bold text-[#e8eaed]">
                {isEditing ? "Edit Work Log" : "Create New Work Log"}
              </h2>
              <p className="text-[12.5px] text-[#9aa0a6]">
                {isEditing
                  ? "Refine your activity summary and metadata"
                  : "Record your latest accomplishment cleanly"}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="rounded-full p-2 text-[#9aa0a6] transition-colors hover:bg-white/5 hover:text-[#e8eaed]"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form Body with Generous Spacing */}
        <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-6">
          {/* Error Banner */}
          {error && (
            <div className="flex items-center gap-2.5 rounded-2xl border border-[#f28b82]/20 bg-[#f28b82]/10 p-4 text-[13px] text-[#f28b82]">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Project Selection */}
          <div className="space-y-2">
            <label className="block text-[12px] font-semibold uppercase tracking-wider text-[#9aa0a6]">
              Target Project
            </label>
            <div className="flex flex-wrap gap-2.5">
              {PROJECTS.map((proj) => {
                const active = selectedProject === proj;
                return (
                  <button
                    key={proj}
                    type="button"
                    onClick={() => setSelectedProject(proj)}
                    className={`rounded-full px-4 py-2 text-[13px] font-medium transition-all ${
                      active
                        ? "bg-[#8ab4f8] text-[#141414] shadow-md font-semibold scale-[1.02]"
                        : "border border-white/10 bg-white/5 text-[#c4c7c5] hover:bg-white/10 hover:text-white"
                    }`}
                  >
                    {proj}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Category Selector */}
          <div className="space-y-2">
            <label className="block text-[12px] font-semibold uppercase tracking-wider text-[#9aa0a6]">
              Categories (Pick one or more)
            </label>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map((cat) => {
                const active = selectedCategories.includes(cat);
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => toggleCategory(cat)}
                    className="transition-transform active:scale-95"
                  >
                    <CategoryTag category={cat} selected={active} />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Summary Textarea */}
          <div className="space-y-2">
            <label className="block text-[12px] font-semibold uppercase tracking-wider text-[#9aa0a6]">
              Activity Summary & Details
            </label>
            <Textarea
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder="Provide a detailed overview of what you built, fixed, analyzed, or designed today..."
              rows={5}
              required
              minLength={10}
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
