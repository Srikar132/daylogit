"use client";

import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { todayIST } from "@/lib/date";

export function WorklogCalendarPicker() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const currentDateParam = searchParams.get("date") || (searchParams.get("today") === "true" ? todayIST() : todayIST());
  
  const initialDate = currentDateParam ? new Date(currentDateParam) : new Date();
  const [viewYear, setViewYear] = useState(initialDate.getFullYear());
  const [viewMonth, setViewMonth] = useState(initialDate.getMonth());

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function handleSelectDate(year: number, month: number, day: number) {
    const formattedDate = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const params = new URLSearchParams(searchParams.toString());
    params.delete("q");
    if (formattedDate === todayIST()) {
      params.set("today", "true");
    } else {
      params.delete("today");
    }
    params.set("date", formattedDate);
    params.set("page", "1");
    router.push(`/?${params.toString()}`);
    setIsOpen(false);
  }

  function handlePrevMonth() {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  }

  function handleNextMonth() {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  }

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];

  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstDayOfWeek = new Date(viewYear, viewMonth, 1).getDay();

  const isTodaySelected = currentDateParam === todayIST();

  return (
    <div className="relative" ref={containerRef}>
      {/* Premium Fully-Rounded "Today" Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className={`flex cursor-pointer items-center gap-2.5 rounded-full border px-5 py-2.5 text-[14px] font-semibold transition-all shadow-md active:scale-95 ${
          isTodaySelected
            ? "border-[#8ab4f8] bg-[#004a77] text-[#c2e7ff] ring-2 ring-[#8ab4f8]/40"
            : "border-white/10 bg-[#131314] text-[#e8eaed] hover:border-[#8ab4f8]/50 hover:bg-[#28292c]"
        }`}
      >
        <CalendarIcon className="h-4 w-4 text-[#8ab4f8]" />
        <span>Today</span>
      </button>

      {/* Calendar Dropdown Popover */}
      {isOpen && (
        <div className="absolute right-0 top-14 z-50 w-72 rounded-2xl border border-white/10 bg-[#131314] p-4 text-[#e8eaed] shadow-2xl backdrop-blur-xl">

          {/* Month Header */}
          <div className="flex items-center justify-between pb-3 border-b border-white/5 mb-3">
            <span className="text-[14px] font-semibold text-[#e8eaed]">
              {monthNames[viewMonth]} {viewYear}
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={handlePrevMonth}
                className="rounded-full p-1 text-[#9aa0a6] hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={handleNextMonth}
                className="rounded-full p-1 text-[#9aa0a6] hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Days of Week Header */}
          <div className="grid grid-cols-7 text-center text-[11px] font-semibold text-[#9aa0a6] pb-2">
            <span>Su</span>
            <span>Mo</span>
            <span>Tu</span>
            <span>We</span>
            <span>Th</span>
            <span>Fr</span>
            <span>Sa</span>
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-1 text-center text-[12px]">
            {Array.from({ length: firstDayOfWeek }).map((_, i) => (
              <div key={`empty-${i}`} />
            ))}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const dayNum = i + 1;
              const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${String(dayNum).padStart(2, "0")}`;
              const isSelected = currentDateParam === dateStr;
              const isToday = todayIST() === dateStr;

              return (
                <button
                  key={dayNum}
                  type="button"
                  onClick={() => handleSelectDate(viewYear, viewMonth, dayNum)}
                  className={`flex h-8 w-8 cursor-pointer items-center justify-center rounded-full transition-all ${
                    isSelected
                      ? "bg-[#004a77] text-[#c2e7ff] font-bold ring-2 ring-[#8ab4f8]"
                      : isToday
                      ? "border border-[#8ab4f8] text-[#8ab4f8] font-semibold"
                      : "text-[#c4c7c5] hover:bg-white/10 hover:text-white"
                  }`}
                >
                  {dayNum}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
