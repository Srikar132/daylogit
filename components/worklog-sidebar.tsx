"use client";

import {
  CheckSquare,
  ChevronDown,
  Plus,
  SquareCheck,
  Square,
  Star,
  X,
} from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import type { SectionRow } from "@/lib/worklog";

interface WorklogSidebarProps {
  allSections: SectionRow[];
  selectedSectionNames: string[];
  onToggleSectionName: (name: string) => void;
  onRefreshSections?: () => void;
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export function WorklogSidebar({
  allSections,
  selectedSectionNames,
  onToggleSectionName,
  onRefreshSections,
  isMobileOpen = false,
  onCloseMobile,
}: WorklogSidebarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const isTodayFilter = searchParams.get("today") === "true";
  const dateFilter = searchParams.get("date");
  const isAllActive = !isTodayFilter && !dateFilter;

  const [listsOpen, setListsOpen] = useState(true);
  const [isCreatingList, setIsCreatingList] = useState(false);
  const [newListName, setNewListName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  function handleShowAllLogs() {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("today");
    params.delete("date");
    params.delete("q");
    params.set("page", "1");
    router.push(`/?${params.toString()}`);
    if (onCloseMobile) onCloseMobile();
  }

  async function handleCreateSection(e: React.FormEvent) {
    e.preventDefault();
    if (!newListName.trim()) return;

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/sections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newListName.trim() }),
      });
      if (res.ok) {
        setNewListName("");
        setIsCreatingList(false);
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
      {/* Create Pill Button (Exact Google Tasks style) */}
      <button
        type="button"
        onClick={() => setIsCreatingList(true)}
        className="flex cursor-pointer items-center gap-3.5 rounded-2xl border border-white/10 bg-[#131314] px-5 py-3.5 text-[14px] font-semibold text-[#8ab4f8] shadow-md transition-all hover:bg-[#28292c] active:scale-95"
      >
        <Plus className="h-5 w-5 stroke-[2.5]" />
        <span>Create</span>
      </button>

      {/* Primary Navigation Links */}
      <div className="flex flex-col gap-1">
        {/* All logs */}
        <button
          type="button"
          onClick={handleShowAllLogs}
          className={`flex w-full cursor-pointer items-center gap-3.5 rounded-full px-4 py-2.5 text-[13.5px] font-medium transition-all ${
            isAllActive
              ? "bg-[#004a77] text-[#c2e7ff] font-semibold"
              : "text-[#c4c7c5] hover:bg-white/5 hover:text-white"
          }`}
        >
          <CheckSquare className="h-4 w-4 text-[#8ab4f8]" />
          <span>All logs</span>
        </button>

        {/* Starred */}
        <button
          type="button"
          className="flex w-full cursor-pointer items-center gap-3.5 rounded-full px-4 py-2.5 text-[13.5px] font-medium text-[#c4c7c5] hover:bg-white/5 hover:text-white transition-all"
        >
          <Star className="h-4 w-4 text-[#9aa0a6]" />
          <span>Starred</span>
        </button>
      </div>

      {/* Lists Accordion Section (Matching Google Tasks lists format) */}
      <div className="flex flex-col gap-1 border-t border-white/10 pt-4">
        <button
          type="button"
          onClick={() => setListsOpen((prev) => !prev)}
          className="flex cursor-pointer items-center justify-between px-3 py-1 text-[12px] font-semibold tracking-wide text-[#9aa0a6] hover:text-white"
        >
          <span>Lists</span>
          <ChevronDown
            className={`h-4 w-4 transition-transform ${
              listsOpen ? "" : "-rotate-90"
            }`}
          />
        </button>

        {listsOpen && (
          <div className="mt-1 flex flex-col gap-0.5 pl-1">
            {allSections.map((sec) => {
              const isChecked = selectedSectionNames.includes(sec.name);
              return (
                <button
                  key={sec.id || sec.name}
                  type="button"
                  onClick={() => onToggleSectionName(sec.name)}
                  className="flex w-full cursor-pointer items-center gap-3 rounded-full px-3 py-2 text-[13.5px] text-[#c4c7c5] hover:bg-white/5 hover:text-white transition-colors"
                >
                  {isChecked ? (
                    <SquareCheck className="h-4 w-4 text-[#8ab4f8] fill-[#8ab4f8]/20 shrink-0" />
                  ) : (
                    <Square className="h-4 w-4 text-[#9aa0a6] shrink-0" />
                  )}
                  <span className="truncate">{sec.name}</span>
                </button>
              );
            })}

            {/* Create new list action */}
            {!isCreatingList ? (
              <button
                type="button"
                onClick={() => setIsCreatingList(true)}
                className="mt-1.5 flex w-full cursor-pointer items-center gap-3 rounded-full px-3 py-2 text-[13px] text-[#8ab4f8] hover:bg-white/5 transition-colors"
              >
                <Plus className="h-4 w-4 stroke-[2.5]" />
                <span>Create new list</span>
              </button>
            ) : (
              <form onSubmit={handleCreateSection} className="mt-2 flex flex-col gap-2 p-3 rounded-2xl bg-[#131314] border border-white/10 shadow-lg">
                <input
                  type="text"
                  value={newListName}
                  onChange={(e) => setNewListName(e.target.value)}
                  placeholder="Enter list title"
                  autoFocus
                  className="w-full bg-transparent px-1 py-1 text-[13px] text-[#e8eaed] placeholder:text-[#9aa0a6] focus:outline-none"
                />
                <div className="flex justify-end gap-1.5 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setIsCreatingList(false);
                      setNewListName("");
                    }}
                    className="rounded-full px-3 py-1 text-[11.5px] text-[#9aa0a6] hover:text-white cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting || !newListName.trim()}
                    className="rounded-full bg-[#8ab4f8] px-3.5 py-1 text-[11.5px] font-semibold text-[#141414] disabled:opacity-50 cursor-pointer"
                  >
                    Done
                  </button>
                </div>
              </form>
            )}
          </div>
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
