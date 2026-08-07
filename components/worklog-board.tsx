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
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  horizontalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useEffect, useState } from "react";
import { SectionCard } from "@/components/section-card";
import type { EntryRow, SectionWithEntries } from "@/lib/worklog";

interface WorklogBoardProps {
  initialSections: SectionWithEntries[];
  visibleSectionNames?: string[];
  onRefresh?: () => void;
}

function SortableSectionItem({
  section,
  onRefresh,
}: {
  section: SectionWithEntries;
  onRefresh: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({
      id: `section-${section.id}`,
      data: {
        type: "section",
        sectionId: section.id,
      },
    });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="shrink-0">
      <SectionCard
        section={section}
        onRefresh={onRefresh}
        dragHandleProps={{ ...attributes, ...listeners }}
      />
    </div>
  );
}

export function WorklogBoard({
  initialSections,
  visibleSectionNames,
  onRefresh,
}: WorklogBoardProps) {
  const [sectionsList, setSectionsList] = useState<SectionWithEntries[]>(initialSections);
  const [activeLog, setActiveLog] = useState<EntryRow | null>(null);
  const [activeSection, setActiveSection] = useState<SectionWithEntries | null>(null);

  useEffect(() => {
    setSectionsList(initialSections);
  }, [initialSections]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 3 } }),
    useSensor(MouseSensor, { activationConstraint: { distance: 3 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 100, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const displayedSections = visibleSectionNames
    ? sectionsList.filter((s) => visibleSectionNames.includes(s.name))
    : sectionsList;

  function handleDragStart(event: DragStartEvent) {
    const { active } = event;
    const type = active.data.current?.type;

    if (type === "section") {
      const secId = active.data.current?.sectionId;
      const foundSec = sectionsList.find((s) => s.id === secId);
      if (foundSec) setActiveSection(foundSec);
    } else if (type === "log") {
      const logId = active.data.current?.logId;
      let foundLog: EntryRow | undefined;
      for (const sec of sectionsList) {
        foundLog = sec.entries.find((e) => e.id === logId);
        if (foundLog) break;
      }
      if (foundLog) setActiveLog(foundLog);
    }
  }

  async function handleDragEnd(event: DragEndEvent) {
    setActiveLog(null);
    setActiveSection(null);

    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const activeType = active.data.current?.type;

    // 1. Column Section Reordering
    if (activeType === "section") {
      const activeSecId = String(active.id).replace(/^section-/, "");
      const overSecId = String(over.id).replace(/^section-/, "");

      const oldIndex = sectionsList.findIndex((s) => s.id === activeSecId);
      const newIndex = sectionsList.findIndex((s) => s.id === overSecId);

      if (oldIndex !== -1 && newIndex !== -1) {
        const newArr = arrayMove(sectionsList, oldIndex, newIndex);
        setSectionsList(newArr);

        const ordersPayload = newArr
          .map((sec, idx) => ({ id: sec.id, order: idx }))
          .filter((s) => Boolean(s.id));

        try {
          await fetch("/api/sections", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ orders: ordersPayload }),
          });
        } catch (err) {
          console.error("Failed to reorder sections", err);
        }
      }
      return;
    }

    // 2. Log Entry Drag & Drop between Section Columns
    if (activeType === "log") {
      const logId = active.data.current?.logId;
      const sourceSectionId = active.data.current?.sectionId;

      let targetSectionId: string | undefined = over.data.current?.sectionId;
      if (!targetSectionId && String(over.id).startsWith("section-")) {
        targetSectionId = String(over.id).replace(/^section-/, "");
      }

      if (logId && targetSectionId && targetSectionId !== sourceSectionId) {
        // Optimistic State Update
        setSectionsList((prevSections) => {
          let draggedLog: EntryRow | null = null;
          const next = prevSections.map((sec) => {
            if (sec.id === sourceSectionId) {
              const remaining = sec.entries.filter((e) => {
                if (e.id === logId) {
                  draggedLog = { ...e, sectionId: targetSectionId! };
                  return false;
                }
                return true;
              });
              return { ...sec, entries: remaining };
            }
            return sec;
          });

          if (draggedLog) {
            return next.map((sec) => {
              if (sec.id === targetSectionId) {
                return { ...sec, entries: [...sec.entries, draggedLog!] };
              }
              return sec;
            });
          }
          return next;
        });

        try {
          await fetch("/api/entries/move", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              entryId: logId,
              targetSection: targetSectionId,
            }),
          });
          if (onRefresh) onRefresh();
        } catch (err) {
          console.error("Failed to move log entry to section", err);
        }
      }
    }
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex h-full w-full overflow-x-auto p-4 sm:p-6 gap-4 items-start scrollbar-thin scrollbar-thumb-[#2e2f33] scroll-smooth">
        <SortableContext
          items={displayedSections.map((s) => `section-${s.id || s.name}`)}
          strategy={horizontalListSortingStrategy}
        >
          {displayedSections.map((sec) => (
            <SortableSectionItem
              key={sec.id || sec.name}
              section={sec}
              onRefresh={onRefresh || (() => {})}
            />
          ))}
        </SortableContext>

        {displayedSections.length === 0 && (
          <div className="flex h-64 w-full items-center justify-center rounded-2xl border border-dashed border-[#2e2f33] text-[#9aa0a6]">
            No sections selected. Select sections from the sidebar.
          </div>
        )}
      </div>

      <DragOverlay>
        {activeSection ? (
          <div className="opacity-90 scale-[1.02] shadow-2xl">
            <SectionCard section={activeSection} />
          </div>
        ) : activeLog ? (
          <div className="rounded-2xl p-3.5 bg-[#1e1f20] border border-[#8ab4f8] shadow-2xl w-72 md:w-80 cursor-grabbing opacity-95">
            <div className="flex items-center gap-2 mb-1">
              <div className="h-2 w-2 rounded-full bg-[#8ab4f8]" />
              {activeLog.title && (
                <span className="text-[14px] font-semibold text-[#e8eaed] truncate">
                  {activeLog.title}
                </span>
              )}
            </div>
            <p className="text-[12.5px] text-[#c4c7c5] line-clamp-2 leading-relaxed">
              {activeLog.summary}
            </p>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
