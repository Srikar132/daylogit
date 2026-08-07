"use client";

import { Plus, X } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { todayIST } from "@/lib/date";
import type { SectionRow } from "@/lib/worklog";

interface WorklogSidebarProps {
  sections: SectionRow[];
  onRefreshSections?: () => void;
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export function WorklogSidebar({
  sections,
  onRefreshSections,
  isMobileOpen = false,
  onCloseMobile,
}: WorklogSidebarProps) {
  const searchParams = useSearchParams();
  const currentDate = searchParams.get("date") || todayIST();

  const [isCreatingSection, setIsCreatingSection] = useState(false);
  const [newSectionName, setNewSectionName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleCreateSection(e: React.FormEvent) {
    e.preventDefault();
    if (!newSectionName.trim()) return;

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/sections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newSectionName.trim(), date: currentDate }),
      });
      if (res.ok) {
        setNewSectionName("");
        setIsCreatingSection(false);
        if (onRefreshSections) onRefreshSections();
      }
    } catch (err) {
      console.error("Failed to create section", err);
    } finally {
      setIsSubmitting(false);
    }
  }

  const sidebarContent = (
    <div className="flex h-full w-64 flex-col gap-5 p-4 bg-[#1e1f20] text-[#e8eaed] select-none">
      {/* Section header for this date */}
      {/* Read-only list of this date's sections */}
      <div className="flex flex-col gap-0.5 pt-1">
        {sections.length === 0 ? (
          <p className="px-3 py-2 text-[12.5px] text-[#80868b]">
            No sections for this date yet.
          </p>
        ) : (
          sections.map((sec) => (
            <div
              key={sec.id}
              className="flex w-full items-center gap-3 rounded-full px-3 py-2 text-[13.5px] text-[#c4c7c5]"
            >
              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#8ab4f8]" />
              <span className="truncate">{sec.name}</span>
            </div>
          ))
        )}

        {/* Create section — always scoped to the currently selected date */}
        {!isCreatingSection ? (
          <button
            type="button"
            onClick={() => setIsCreatingSection(true)}
            className="mt-1.5 flex w-full cursor-pointer items-center gap-3 rounded-full px-3 py-2 text-[13px] text-[#8ab4f8] hover:bg-white/5 transition-colors"
          >
            <Plus className="h-4 w-4 stroke-[2.5]" />
            <span>Create section</span>
          </button>
        ) : (
          <form
            onSubmit={handleCreateSection}
            className="mt-2 flex flex-col gap-2 p-3 rounded-2xl bg-[#131314] border border-white/10 shadow-lg"
          >
            <input
              type="text"
              value={newSectionName}
              onChange={(e) => setNewSectionName(e.target.value)}
              placeholder="Section title"
              autoFocus
              className="w-full bg-transparent px-1 py-1 text-[13px] text-[#e8eaed] placeholder:text-[#9aa0a6] focus:outline-none"
            />
            <div className="flex justify-end gap-1.5 pt-1">
              <button
                type="button"
                onClick={() => {
                  setIsCreatingSection(false);
                  setNewSectionName("");
                }}
                className="rounded-full px-3 py-1 text-[11.5px] text-[#9aa0a6] hover:text-white cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !newSectionName.trim()}
                className="rounded-full bg-[#8ab4f8] px-3.5 py-1 text-[11.5px] font-semibold text-[#141414] disabled:opacity-50 cursor-pointer"
              >
                Done
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Persistent Sidebar */}
      <aside className="hidden w-64 shrink-0 border-r border-[#2e2f33] bg-[#1e1f20] md:block">
        {sidebarContent}
      </aside>

      {/* Mobile Drawer Overlay */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          {/* Backdrop */}
          <div
            onClick={onCloseMobile}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm cursor-pointer transition-opacity"
          />

          {/* Drawer content */}
          <div className="relative flex w-64 flex-col bg-[#1e1f20] shadow-2xl z-10">
            <button
              type="button"
              onClick={onCloseMobile}
              aria-label="Close Navigation"
              className="absolute right-3 top-3 rounded-full p-2 text-[#9aa0a6] hover:bg-white/10 hover:text-white cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
}
