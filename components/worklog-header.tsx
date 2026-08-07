"use client";

import { Check, Menu } from "lucide-react";
import { useRouter } from "next/navigation";
import { WorklogCalendarPicker } from "@/components/worklog-calendar-picker";

interface WorklogHeaderProps {
  onToggleMobileSidebar?: () => void;
}

export function WorklogHeader({ onToggleMobileSidebar }: WorklogHeaderProps) {
  const router = useRouter();

  return (
    <header className="sticky top-0 z-40 grid h-16 w-full grid-cols-[1fr_auto_1fr] items-center border-b border-[#2e2f33] bg-[#1e1f20]/95 px-4 backdrop-blur-md sm:px-6">
      {/* Left: Mobile Menu + Brand Logo */}
      <div className="flex items-center gap-3 justify-self-start">
        <button
          type="button"
          onClick={onToggleMobileSidebar}
          aria-label="Toggle Navigation"
          className="rounded-full p-2 text-[#9aa0a6] transition-colors hover:bg-white/5 hover:text-[#e8eaed] md:hidden cursor-pointer"
        >
          <Menu className="h-5 w-5" />
        </button>

        <div
          onClick={() => router.push("/")}
          className="flex cursor-pointer items-center gap-2.5 transition-opacity hover:opacity-90 select-none"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#1b6ef3] text-white shadow-md">
            <Check className="h-5 w-5 stroke-[3]" />
          </div>
          <span className="hidden text-[20px] font-medium tracking-tight text-[#e8eaed] sm:inline">
            DayLog
          </span>
        </div>
      </div>

      {/* Center: Premium date chip — the single source of truth for "which day" */}
      <div className="justify-self-center">
        <WorklogCalendarPicker />
      </div>

      {/* Right: reserved, kept empty so the center chip stays visually centered */}
      <div className="justify-self-end" />
    </header>
  );
}
