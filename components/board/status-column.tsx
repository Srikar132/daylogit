"use client";

import { useDroppable } from "@dnd-kit/core";
import { SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Plus } from "lucide-react";
import { useState } from "react";
import { CreateTaskForm } from "@/components/board/create-task-form";
import { LogCardContent } from "@/components/board/log-card";
import { getWorkTypeColor } from "@/components/board/work-type-icon";
import type { EntryListItem } from "@/lib/worklog";
import type { TaskStatus } from "@/lib/db";

interface StatusColumnProps {
  status: TaskStatus;
  label: string;
  entries: EntryListItem[];
  isDropTarget: boolean;
  canWrite: boolean;
  onOpenEntry?: (log: EntryListItem) => void;
  onCreated?: () => void;
}

// Title-only row — the list never fetches (or holds) a summary at all (see
// lib/worklog.ts's EntryListItem); the full body only ever loads inside
// EntryDetailDialog, lazily, for the one entry actually clicked.
function DraggableLogItem({
  log,
  status,
  onOpen,
}: {
  log: EntryListItem;
  status: TaskStatus;
  onOpen?: (log: EntryListItem) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: `log-${log.id}`,
    data: {
      type: "log",
      logId: log.id,
      status,
    },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : 1,
    zIndex: isDragging ? 50 : 1,
    // Left accent bar keyed to work type — the same color WorkTypeIcon
    // already uses, just reused as a scannable strip instead of only a
    // tiny icon, so a column reads at a glance instead of needing to
    // parse each row's icon individually.
    borderLeftColor: getWorkTypeColor(log.workType),
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      onClick={() => onOpen?.(log)}
      {...attributes}
      {...listeners}
      className="flex w-full cursor-pointer flex-col gap-1 rounded-lg border border-white/[0.06] border-l-[3px] bg-white/[0.03] px-2.5 py-2 text-left shadow-sm transition-colors hover:border-white/[0.1] hover:bg-white/[0.06] touch-none select-none"
    >
      <LogCardContent log={log} />
    </div>
  );
}

export function StatusColumn({
  status,
  label,
  entries,
  isDropTarget,
  canWrite,
  onOpenEntry,
  onCreated,
}: StatusColumnProps) {
  const { setNodeRef } = useDroppable({ id: status, data: { status } });
  const [isCreating, setIsCreating] = useState(false);

  return (
    <div
      ref={setNodeRef}
      className={`flex min-w-0 flex-1 flex-col rounded-xl border px-2 py-2 transition-colors ${
        isDropTarget
          ? "border-[#8ab4f8]/40 bg-[#8ab4f8]/[0.06] ring-1 ring-[#8ab4f8]/40"
          : "border-white/[0.05] bg-white/[0.015]"
      }`}
    >
      <div className="flex items-center gap-2 border-b border-white/[0.05] px-1 pb-2">
        <h2 className="truncate text-[13.5px] font-medium text-[#e8eaed]">{label}</h2>
        <span className="shrink-0 rounded-md bg-white/[0.08] px-1.5 py-0.5 text-[11px] font-medium text-[#9aa0a6]">
          {entries.length}
        </span>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-1.5 overflow-y-auto scrollbar-thin pt-1.5">
        <SortableContext
          items={entries.map((log) => `log-${log.id}`)}
          strategy={verticalListSortingStrategy}
        >
          {entries.map((log) => (
            <DraggableLogItem key={log.id} log={log} status={status} onOpen={onOpenEntry} />
          ))}
        </SortableContext>

        {canWrite &&
          (isCreating ? (
            <CreateTaskForm
              status={status}
              onCreated={() => {
                setIsCreating(false);
                onCreated?.();
              }}
              onCancel={() => setIsCreating(false)}
            />
          ) : (
            <button
              type="button"
              onClick={() => setIsCreating(true)}
              className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[13px] text-[#9aa0a6] hover:bg-white/[0.05] hover:text-[#e8eaed] transition-colors cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" />
              Create
            </button>
          ))}
      </div>
    </div>
  );
}
