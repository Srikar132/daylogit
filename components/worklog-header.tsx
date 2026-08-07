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
    <header className="sticky top-0 z-40 flex h-16 w-full items-center justify-between border-b border-[#2e2f33] bg-[#1e1f20] px-4 backdrop-blur-md sm:px-6">
      {/* Left: Mobile Menu + Brand Logo */}
      <div className="flex items-center gap-3">
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
          <span className="text-[20px] font-medium tracking-tight text-[#e8eaed]">
            DayLog
          </span>
        </div>
      </div>

      {/* Right Controls: Fully Rounded Today Button */}
      <div className="flex items-center gap-3">
        <WorklogCalendarPicker />
      </div>
    </header>
  );
}
