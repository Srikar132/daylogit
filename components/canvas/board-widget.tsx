"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, ListFilter, Search } from "lucide-react";
import { useRef, useState } from "react";
import { EntryBoard } from "@/components/board/entry-board";
import { addDaysIST, formatDateLabel, todayIST } from "@/lib/date";
import type { BoardColumn } from "@/lib/worklog";

interface BoardWidgetProps {
  columns: BoardColumn[];
  canWrite: boolean;
}

const SEARCH_DEBOUNCE_MS = 300;

async function fetchBoard(date: string, search: string): Promise<{ columns: BoardColumn[] }> {
  const params = new URLSearchParams({ date });
  if (search.trim()) params.set("search", search.trim());
  const res = await fetch(`/api/board?${params.toString()}`);
  if (!res.ok) throw new Error(`Failed to load board (${res.status})`);
  return res.json();
}

export function BoardWidget({ columns: initialColumns, canWrite }: BoardWidgetProps) {
  const queryClient = useQueryClient();
  const [date, setDate] = useState(todayIST());
  const [search, setSearch] = useState("");
  // Debounced separately from `search` (which drives the input directly) —
  // this is what actually feeds the query key, so typing doesn't fire a
  // request per keystroke.
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const searchDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isInitialQuery = date === todayIST() && !debouncedSearch.trim();
  const queryKey = ["board", date, debouncedSearch];

  const { data, isFetching, dataUpdatedAt } = useQuery({
    queryKey,
    queryFn: () => fetchBoard(date, debouncedSearch),
    // Seeds the very first (today, no search) query with what the server
    // already prefetched — every other date/search combo just fetches for
    // real. Revisiting today afterward reads back from react-query's own
    // cache instead of needing the old manual "reset to initialColumns"
    // special case.
    initialData: isInitialQuery ? { columns: initialColumns } : undefined,
    staleTime: 30_000,
  });

  const columns = data?.columns ?? initialColumns;

  function goToDate(newDate: string) {
    setDate(newDate);
  }

  function handleSearchChange(value: string) {
    setSearch(value);
    if (searchDebounce.current) clearTimeout(searchDebounce.current);
    searchDebounce.current = setTimeout(() => setDebouncedSearch(value), SEARCH_DEBOUNCE_MS);
  }

  function handleRefresh() {
    void queryClient.invalidateQueries({ queryKey });
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
          key={dataUpdatedAt}
          initialColumns={columns}
          onRefresh={handleRefresh}
          canWrite={canWrite}
        />
        {isFetching && (
          <div className="absolute inset-x-0 top-0 z-10 h-[2px] overflow-hidden bg-white/[0.04]">
            <div className="loading-sweep-bar h-full w-1/3 rounded-full bg-[#8ab4f8]" />
          </div>
        )}
      </div>
    </div>
  );
}
