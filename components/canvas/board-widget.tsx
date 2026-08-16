"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ListFilter, Search } from "lucide-react";
import { useRef, useState } from "react";
import { EntryBoard } from "@/components/board/entry-board";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { WORK_TYPES, type WorkType } from "@/lib/constants";
import type { BoardColumn } from "@/lib/worklog";

interface BoardWidgetProps {
  columns: BoardColumn[];
  canWrite: boolean;
}

const SEARCH_DEBOUNCE_MS = 300;

async function fetchBoard(search: string, workTypes: WorkType[]): Promise<{ columns: BoardColumn[] }> {
  const params = new URLSearchParams();
  if (search.trim()) params.set("search", search.trim());
  if (workTypes.length > 0) params.set("workTypes", workTypes.join(","));
  const res = await fetch(`/api/board?${params.toString()}`);
  if (!res.ok) throw new Error(`Failed to load board (${res.status})`);
  return res.json();
}

export function BoardWidget({ columns: initialColumns, canWrite }: BoardWidgetProps) {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  // Debounced separately from `search` (which drives the input directly) —
  // this is what actually feeds the query key, so typing doesn't fire a
  // request per keystroke.
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const searchDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [workTypeFilter, setWorkTypeFilter] = useState<WorkType[]>([]);
  // Owned here, not inside EntryBoard — EntryBoard remounts (via the `key`
  // below) on every board refetch, which would otherwise silently close the
  // dialog if a refetch landed while it was open.
  const [openEntryId, setOpenEntryId] = useState<string | null>(null);

  const isInitialQuery = !debouncedSearch.trim() && workTypeFilter.length === 0;
  const queryKey = ["board", debouncedSearch, workTypeFilter];

  const { data, isFetching, dataUpdatedAt } = useQuery({
    queryKey,
    queryFn: () => fetchBoard(debouncedSearch, workTypeFilter),
    // Seeds the very first (no search, no filter) query with what the server
    // already prefetched — every other search/filter combo just fetches for
    // real. Clearing back to no-filter afterward reads from react-query's
    // own cache instead of needing a manual "reset to initialColumns" case.
    initialData: isInitialQuery ? { columns: initialColumns } : undefined,
    staleTime: 30_000,
  });

  const columns = data?.columns ?? initialColumns;

  function handleSearchChange(value: string) {
    setSearch(value);
    if (searchDebounce.current) clearTimeout(searchDebounce.current);
    searchDebounce.current = setTimeout(() => setDebouncedSearch(value), SEARCH_DEBOUNCE_MS);
  }

  function toggleWorkType(type: WorkType, checked: boolean) {
    setWorkTypeFilter((current) =>
      checked ? [...current, type] : current.filter((t) => t !== type),
    );
  }

  function handleRefresh() {
    void queryClient.invalidateQueries({ queryKey });
  }

  return (
    <div className="flex h-full flex-col">
      {/* `nodrag` — the search input is real text a user will click-drag to
          select; without it that gesture gets captured by xyflow's canvas.
          `nopan` — xyflow's own "nopan" class (separate from "nodrag")
          exempts an element from the PANE's pan-gesture pointer capture
          regardless of the node's own selected/draggable state. Without it,
          on an idle (unselected) widget — where the node itself has no
          "nopan" class, since xyflow only auto-adds that once selected —
          the pane's own pointer handling still engages for a pointerdown
          here, and that appears to race with/break the Filter dropdown's
          own pointer-based open logic: reproducibly, the dropdown opens
          fine once the widget is already selected, but never opens on a
          genuinely first, pre-selection click. Explicitly opting this
          toolbar out of pane gestures — independent of selection — fixes
          it for the very first click too. */}
      <div className="nodrag nopan flex shrink-0 items-center gap-2 border-b border-widget-border px-3 py-2">
        <div className="flex min-w-0 flex-1 items-center gap-1.5 rounded-full border border-widget-border bg-widget-surface px-2.5 py-1.5">
          <Search className="h-3.5 w-3.5 shrink-0 text-widget-text-secondary" />
          <input
            type="text"
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Search board"
            className="min-w-0 flex-1 bg-transparent text-[12.5px] text-widget-text-primary placeholder:text-widget-text-muted focus:outline-none"
          />
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger className="flex shrink-0 items-center gap-1.5 rounded-full border border-widget-border bg-widget-surface px-2.5 py-1.5 text-[12px] text-widget-text-secondary transition-colors hover:text-widget-text-primary cursor-pointer">
            <ListFilter className="h-3.5 w-3.5" />
            Filter
            {workTypeFilter.length > 0 && (
              <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground">
                {workTypeFilter.length}
              </span>
            )}
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {WORK_TYPES.map((wt) => (
              <DropdownMenuCheckboxItem
                key={wt.value}
                checked={workTypeFilter.includes(wt.value)}
                onCheckedChange={(checked) => toggleWorkType(wt.value, checked)}
                closeOnClick={false}
              >
                <span
                  className="h-2 w-2 shrink-0 rounded-full"
                  style={{ backgroundColor: wt.color }}
                />
                {wt.label}
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <div className="relative min-h-0 flex-1 overflow-hidden">
        <EntryBoard
          key={dataUpdatedAt}
          initialColumns={columns}
          onRefresh={handleRefresh}
          canWrite={canWrite}
          openEntryId={openEntryId}
          onOpenEntry={setOpenEntryId}
          onCloseEntry={() => setOpenEntryId(null)}
        />
        {isFetching && (
          <div className="absolute inset-x-0 top-0 z-10 h-[2px] overflow-hidden bg-white/[0.04]">
            <div className="loading-sweep-bar h-full w-1/3 rounded-full bg-zinc-200" />
          </div>
        )}
      </div>
    </div>
  );
}
