"use client";

import { ChevronLeft, ChevronRight, ListFilter, Search } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { WorklogBoard } from "@/components/worklog-board";
import { addDaysIST, formatDateLabel, todayIST } from "@/lib/date";
import type { BoardColumn } from "@/lib/worklog";

interface BoardWidgetProps {
  columns: BoardColumn[];
  canWrite: boolean;
}

const SEARCH_DEBOUNCE_MS = 300;

export function BoardWidget({ columns: initialColumns, canWrite }: BoardWidgetProps) {
  const [date, setDate] = useState(todayIST());
  const [search, setSearch] = useState("");
  const [columns, setColumns] = useState(initialColumns);
  const [isLoading, setIsLoading] = useState(false);
  const searchDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchBoard = useCallback(async (targetDate: string, targetSearch: string) => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({ date: targetDate });
      if (targetSearch.trim()) params.set("search", targetSearch.trim());
      const res = await fetch(`/api/board?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setColumns(data.columns);
      }
    } catch (err) {
      console.error("Failed to load board", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (date === todayIST() && !search.trim()) {
      setColumns(initialColumns);
      return;
    }
    fetchBoard(date, search);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date]);

  function handleSearchChange(value: string) {
    setSearch(value);
    if (searchDebounce.current) clearTimeout(searchDebounce.current);
    searchDebounce.current = setTimeout(() => fetchBoard(date, value), SEARCH_DEBOUNCE_MS);
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex shrink-0 items-center gap-2 border-b border-white/[0.06] px-3 py-2">
        <div className="flex min-w-0 flex-1 items-center gap-1.5 rounded-full bg-white/5 px-2.5 py-1.5">
          <Search className="h-3.5 w-3.5 shrink-0 text-[#9aa0a6]" />
          <input
            type="text"
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Search board"
            className="min-w-0 flex-1 bg-transparent text-[12.5px] text-[#e8eaed] placeholder:text-[#80868b] focus:outline-none"
          />
        </div>

        <div className="flex shrink-0 items-center gap-0.5 rounded-full bg-white/5 p-0.5">
          <button
            type="button"
            onClick={() => setDate((d) => addDaysIST(d, -1))}
            className="rounded-full p-1 text-[#9aa0a6] hover:bg-white/10 hover:text-[#e8eaed] cursor-pointer"
            title="Previous day"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setDate(todayIST())}
            className="px-2 text-[12px] font-medium text-[#e8eaed] cursor-pointer"
            title="Jump to today"
          >
            {formatDateLabel(date)}
          </button>
          <button
            type="button"
            onClick={() => setDate((d) => addDaysIST(d, 1))}
            className="rounded-full p-1 text-[#9aa0a6] hover:bg-white/10 hover:text-[#e8eaed] cursor-pointer"
            title="Next day"
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Placeholder — no filter dimension exists yet (status is the only
            axis, and it's already the columns). Shown for layout parity;
            wire up once there's something real to filter by. */}
        <button
          type="button"
          disabled
          title="Coming soon"
          className="flex shrink-0 items-center gap-1.5 rounded-full bg-white/5 px-2.5 py-1.5 text-[12px] text-[#80868b] opacity-60"
        >
          <ListFilter className="h-3.5 w-3.5" />
          Filter
        </button>
      </div>
      <div className="relative min-h-0 flex-1 overflow-hidden">
        <WorklogBoard
          initialColumns={columns}
          onRefresh={() => fetchBoard(date, search)}
          canWrite={canWrite}
        />
        {isLoading && (
          <div className="absolute inset-x-0 top-0 z-10 h-[2px] overflow-hidden bg-white/[0.04]">
            <div className="loading-sweep-bar h-full w-1/3 rounded-full bg-[#8ab4f8]" />
          </div>
        )}
      </div>
    </div>
  );
}
