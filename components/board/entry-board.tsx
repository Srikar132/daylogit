"use client";

import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
} from "@dnd-kit/core";
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { createPortal } from "react-dom";
import { EntryDetailDialog } from "@/components/board/entry-detail-dialog";
import { LogCardContent } from "@/components/board/log-card";
import { StatusColumn } from "@/components/board/status-column";
import { STATUS_COLUMNS, STATUS_LABEL } from "@/lib/constants";
import type { TaskStatus } from "@/lib/db";
import type { BoardColumn, EntryListItem } from "@/lib/worklog";

interface EntryBoardProps {
  initialColumns: BoardColumn[];
  onRefresh?: () => void;
  canWrite: boolean;
  // Lifted up to BoardWidget rather than owned locally here — this component
  // remounts (via the parent's `key={dataUpdatedAt}`) on every board
  // refetch (search, filter, drag-move, delete's own refresh, ...), and a
  // remount resets all local state. If the open-entry id lived here, any
  // background refetch while the dialog was open would silently close it.
  openEntryId: string | null;
  onOpenEntry: (id: string) => void;
  onCloseEntry: () => void;
}

export function EntryBoard({
  initialColumns,
  onRefresh,
  canWrite,
  openEntryId,
  onOpenEntry,
  onCloseEntry,
}: EntryBoardProps) {
  // Seeded once from the parent's data and then mutated locally (optimistic
  // drag reorder) — the parent remounts this component (via `key`) whenever
  // it has a genuinely new data set, so this never needs to resync a prop
  // into state after mount.
  const [columns, setColumns] = useState<BoardColumn[]>(initialColumns);
  const [activeLog, setActiveLog] = useState<EntryListItem | null>(null);
  const [overStatus, setOverStatus] = useState<TaskStatus | null>(null);

  const openEntryStatus = openEntryId
    ? columns.find((c) => c.entries.some((e) => e.id === openEntryId))?.status
    : undefined;

  function handleEntryDeleted(deletedId: string) {
    setColumns((prev) =>
      prev.map((col) => ({ ...col, entries: col.entries.filter((e) => e.id !== deletedId) })),
    );
    onCloseEntry();
    onRefresh?.();
  }

  const dragSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 3 } }),
    useSensor(MouseSensor, { activationConstraint: { distance: 3 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 100, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const noSensors = useSensors();
  const sensors = canWrite ? dragSensors : noSensors;

  function handleDragStart(event: DragStartEvent) {
    const { active } = event;
    const logId = active.data.current?.logId;
    let foundLog: EntryListItem | undefined;
    for (const col of columns) {
      foundLog = col.entries.find((e) => e.id === logId);
      if (foundLog) break;
    }
    if (foundLog) setActiveLog(foundLog);
  }

  const moveMutation = useMutation({
    mutationFn: async (input: { entryId: string; status: TaskStatus }) => {
      const res = await fetch("/api/entries/move", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      if (!res.ok) throw new Error(`Failed to move entry (${res.status})`);
    },
    onSuccess: () => onRefresh?.(),
    onError: (err) => console.error("Failed to move log entry", err),
  });

  function handleDragEnd(event: DragEndEvent) {
    setActiveLog(null);
    setOverStatus(null);

    const { active, over } = event;
    if (!over) return;

    const logId = active.data.current?.logId;
    const sourceStatus = active.data.current?.status as TaskStatus | undefined;
    const targetStatus = (over.data.current?.status ?? over.id) as TaskStatus;

    if (!logId || !sourceStatus || sourceStatus === targetStatus) return;

    setColumns((prev) => {
      let draggedLog: EntryListItem | null = null;
      const next = prev.map((col) => {
        if (col.status === sourceStatus) {
          const remaining = col.entries.filter((e) => {
            if (e.id === logId) {
              draggedLog = { ...e, status: targetStatus };
              return false;
            }
            return true;
          });
          return { ...col, entries: remaining };
        }
        return col;
      });

      if (draggedLog) {
        return next.map((col) =>
          col.status === targetStatus ? { ...col, entries: [...col.entries, draggedLog!] } : col,
        );
      }
      return next;
    });

    moveMutation.mutate({ entryId: logId, status: targetStatus });
  }

  return (
    <DndContext
      id="entry-board"
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={(event) => {
        const { over } = event;
        const status = over ? ((over.data.current?.status ?? over.id) as TaskStatus) : null;
        setOverStatus(status);
      }}
      onDragEnd={handleDragEnd}
    >
      <div className="flex h-full w-full gap-3 p-3">
        {STATUS_COLUMNS.map(({ status }) => {
          const column = columns.find((c) => c.status === status) ?? { status, entries: [] };
          return (
            <StatusColumn
              key={status}
              status={status}
              label={STATUS_LABEL[status]}
              entries={column.entries}
              isDropTarget={overStatus === status}
              canWrite={canWrite}
              onOpenEntry={(log) => onOpenEntry(log.id)}
              onCreated={onRefresh}
            />
          );
        })}
      </div>

      {/*
       * Portalled straight to <body>: `DragOverlay` positions itself with
       * `position: fixed`, but a `transform` on ANY ancestor (react-flow's
       * pan/zoom viewport wraps this whole board) creates a new containing
       * block for fixed descendants per the CSS spec — so without this
       * portal, the dragged ghost gets scaled/translated along with canvas
       * zoom instead of tracking the real cursor.
       */}
      {typeof document !== "undefined" &&
        createPortal(
          <DragOverlay>
            {activeLog ? (
              <div className="flex w-72 flex-col gap-1 rounded-lg bg-[#1e1f20] px-2.5 py-2 shadow-2xl ring-1 ring-[#8ab4f8]/60">
                <LogCardContent log={activeLog} />
              </div>
            ) : null}
          </DragOverlay>,
          document.body,
        )}

      <EntryDetailDialog
        entryId={openEntryId}
        statusLabel={openEntryStatus ? STATUS_LABEL[openEntryStatus] : undefined}
        canWrite={canWrite}
        onClose={onCloseEntry}
        onDeleted={handleEntryDeleted}
      />
    </DndContext>
  );
}
