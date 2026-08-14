"use client";

import { ChevronLeft, ChevronRight, ListFilter, Search } from "lucide-react";
import { useCallback, useRef, useState } from "react";
import { EntryBoard } from "@/components/board/entry-board";
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
  // Bumped every time `columns` gets a genuinely new data set (a fetch
  // resolves, or we reset back to the server-provided initial) — passed to
  // EntryBoard as its `key`, so it remounts with fresh local state instead
  // of needing an effect to resync a prop into state.
  const [dataVersion, setDataVersion] = useState(0);
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
        setDataVersion((v) => v + 1);
      }
    } catch (err) {
      console.error("Failed to load board", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  function goToDate(newDate: string) {
    setDate(newDate);
    if (newDate === todayIST() && !search.trim()) {
      setColumns(initialColumns);
      setDataVersion((v) => v + 1);
    } else {
      fetchBoard(newDate, search);
    }
  }

  function handleSearchChange(value: string) {
    setSearch(value);
    if (searchDebounce.current) clearTimeout(searchDebounce.current);
    searchDebounce.current = setTimeout(() => fetchBoard(date, value), SEARCH_DEBOUNCE_MS);
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex shrink-0 items-center gap-2 border-b border-white/[0.08] px-3 py-2">
        <div className="flex min-w-0 flex-1 items-center gap-1.5 rounded-full border border-white/[0.06] bg-white/[0.04] px-2.5 py-1.5">
          <Search className="h-3.5 w-3.5 shrink-0 text-[#9aa0a6]" />
          <input
            type="text"
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Search board"
            className="min-w-0 flex-1 bg-transparent text-[12.5px] text-[#e8eaed] placeholder:text-[#80868b] focus:outline-none"
          />
        </div>

        <div className="flex shrink-0 items-center gap-0.5 rounded-full border border-white/[0.06] bg-white/[0.04] p-0.5">
          <button
            type="button"
            onClick={() => goToDate(addDaysIST(date, -1))}
            className="rounded-full p-1 text-[#9aa0a6] hover:bg-white/10 hover:text-[#e8eaed] cursor-pointer"
            title="Previous day"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => goToDate(todayIST())}
            className="px-2 text-[12px] font-medium text-[#e8eaed] cursor-pointer"
            title="Jump to today"
          >
            {formatDateLabel(date)}
          </button>
          <button
            type="button"
            onClick={() => goToDate(addDaysIST(date, 1))}
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
          className="flex shrink-0 items-center gap-1.5 rounded-full border border-white/[0.06] bg-white/[0.04] px-2.5 py-1.5 text-[12px] text-[#80868b] opacity-60"
        >
          <ListFilter className="h-3.5 w-3.5" />
          Filter
        </button>
      </div>
      <div className="relative min-h-0 flex-1 overflow-hidden">
        <EntryBoard
          key={dataVersion}
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
