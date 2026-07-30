"use client";

import {
  Calendar,
  CheckSquare,
  ChevronDown,
  Layers,
  Plus,
  X,
} from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { PROJECTS, type Project } from "@/lib/constants";

interface WorklogSidebarProps {
  onOpenCreate: () => void;
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export function WorklogSidebar({
  onOpenCreate,
  isMobileOpen = false,
  onCloseMobile,
}: WorklogSidebarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const currentProject = searchParams.get("project") ?? "all";
  const isTodayFilter = searchParams.get("today") === "true";
  const [listsOpen, setListsOpen] = useState(true);

  function filterByProject(proj: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("today");
    if (proj === "all") {
      params.delete("project");
    } else {
      params.set("project", proj);
    }
    params.set("page", "1");
    router.push(`${pathname}?${params.toString()}`);
    if (onCloseMobile) onCloseMobile();
  }

  function filterToday() {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("project");
    params.set("today", "true");
    params.set("page", "1");
    router.push(`${pathname}?${params.toString()}`);
    if (onCloseMobile) onCloseMobile();
  }

  function showAllLogs() {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("project");
    params.delete("today");
    params.set("page", "1");
    router.push(`${pathname}?${params.toString()}`);
    if (onCloseMobile) onCloseMobile();
  }

  const sidebarContent = (
    <div className="flex h-full w-64 flex-col gap-6 p-4">
      {/* Create Pill Button (Google Tasks style) */}
      <button
        type="button"
        onClick={() => {
          onOpenCreate();
          if (onCloseMobile) onCloseMobile();
        }}
        className="flex items-center gap-3 rounded-full border border-white/10 bg-[#1e1e1e] px-5 py-3.5 text-[14px] font-medium text-[#8ab4f8] shadow-lg transition-all hover:bg-white/10 hover:shadow-xl active:scale-95"
      >
        <Plus className="h-5 w-5 stroke-[2.5]" />
        <span>Create</span>
      </button>

      {/* Main Navigation List */}
      <div className="flex flex-col gap-1">
        {/* All logs */}
        <button
          type="button"
          onClick={showAllLogs}
          className={`flex w-full items-center gap-3 rounded-full px-4 py-2.5 text-[13.5px] font-medium transition-all ${
            currentProject === "all" && !isTodayFilter
              ? "bg-[#004a77] text-[#c2e7ff] font-semibold"
              : "text-[#c4c7c5] hover:bg-white/5"
          }`}
        >
          <CheckSquare className="h-4 w-4" />
          <span>All logs</span>
        </button>

        {/* Today */}
        <button
          type="button"
          onClick={filterToday}
          className={`flex w-full items-center gap-3 rounded-full px-4 py-2.5 text-[13.5px] font-medium transition-all ${
            isTodayFilter
              ? "bg-[#004a77] text-[#c2e7ff] font-semibold"
              : "text-[#c4c7c5] hover:bg-white/5"
          }`}
        >
          <Calendar className="h-4 w-4" />
          <span>Today</span>
        </button>
      </div>

      {/* Projects List Header */}
      <div className="flex flex-col gap-1 border-t border-white/8 pt-4">
        <button
          type="button"
          onClick={() => setListsOpen((prev) => !prev)}
          className="flex items-center justify-between px-4 py-1.5 text-[11.5px] font-semibold uppercase tracking-wider text-[#9aa0a6] hover:text-[#e8eaed]"
        >
          <span className="flex items-center gap-2">
            <Layers className="h-3.5 w-3.5" />
            Projects
          </span>
          <ChevronDown
            className={`h-4 w-4 transition-transform ${
              listsOpen ? "" : "-rotate-90"
            }`}
          />
        </button>

        {/* Project Links */}
        {listsOpen && (
          <div className="mt-1 flex flex-col gap-0.5 pl-2">
            {PROJECTS.map((proj) => {
              const active = currentProject === proj && !isTodayFilter;
              return (
                <button
                  key={proj}
                  type="button"
                  onClick={() => filterByProject(proj)}
                  className={`flex w-full items-center gap-3 rounded-full px-3 py-2 text-[13px] transition-all ${
                    active
                      ? "bg-[#8ab4f8]/15 text-[#8ab4f8] font-semibold"
                      : "text-[#9aa0a6] hover:bg-white/5 hover:text-[#e8eaed]"
                  }`}
                >
                  <span className="h-2 w-2 rounded-full bg-[#8ab4f8]" />
                  <span>{proj}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Persistent Sidebar */}
      <aside className="hidden w-64 shrink-0 border-r border-white/8 bg-[#141414] md:block">
        {sidebarContent}
      </aside>

      {/* Mobile Drawer */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            onClick={onCloseMobile}
          />
          <div className="relative flex w-64 max-w-[80vw] flex-col bg-[#141414] shadow-2xl">
            <div className="flex items-center justify-between p-4 border-b border-white/8">
              <span className="text-[15px] font-bold text-[#e8eaed]">Menu</span>
              <button
                type="button"
                onClick={onCloseMobile}
                className="rounded-full p-1 text-[#9aa0a6] hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
}
