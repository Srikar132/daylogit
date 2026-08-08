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
  DragOverEvent,
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
import { ListChecks } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { EntryDetailDialog } from "@/components/entry-detail-dialog";
import { SectionCard } from "@/components/section-card";
import type { EntryListItem, SectionWithEntries } from "@/lib/worklog";

interface WorklogBoardProps {
  initialSections: SectionWithEntries[];
  onRefresh?: () => void;
}

function SortableSectionItem({
  section,
  isDropTarget,
  onRefresh,
  onOpenEntry,
}: {
  section: SectionWithEntries;
  isDropTarget: boolean;
  onRefresh: () => void;
  onOpenEntry: (log: EntryListItem) => void;
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
        isDropTarget={isDropTarget}
        onOpenEntry={onOpenEntry}
      />
    </div>
  );
}

export function WorklogBoard({ initialSections, onRefresh }: WorklogBoardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  // The dialog's open/closed entry lives in the URL (?entry=<id>), same
  // convention as ?date= for the day picker — shareable/bookmarkable, and the
  // browser's own back button closes it. There's still only ever ONE dialog
  // instance mounted (below); the id just comes from the URL instead of
  // local state, it doesn't change how many dialogs exist.
  const openEntryId = searchParams.get("entry");

  const [sectionsList, setSectionsList] = useState<SectionWithEntries[]>(initialSections);
  const [activeLog, setActiveLog] = useState<EntryListItem | null>(null);
  const [activeSection, setActiveSection] = useState<SectionWithEntries | null>(null);
  const [overSectionId, setOverSectionId] = useState<string | null>(null);

  useEffect(() => {
    setSectionsList(initialSections);
  }, [initialSections]);

  const openEntrySectionName = openEntryId
    ? sectionsList.find((s) => s.entries.some((e) => e.id === openEntryId))?.name
    : undefined;

  function pushEntryParam(id: string | null) {
    const params = new URLSearchParams(searchParams.toString());
    if (id) params.set("entry", id);
    else params.delete("entry");
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  }

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 3 } }),
    useSensor(MouseSensor, { activationConstraint: { distance: 3 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 100, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function handleDragStart(event: DragStartEvent) {
    const { active } = event;
    const type = active.data.current?.type;

    if (type === "section") {
      const secId = active.data.current?.sectionId;
      const foundSec = sectionsList.find((s) => s.id === secId);
      if (foundSec) setActiveSection(foundSec);
    } else if (type === "log") {
      const logId = active.data.current?.logId;
      let foundLog: EntryListItem | undefined;
      for (const sec of sectionsList) {
        foundLog = sec.entries.find((e) => e.id === logId);
        if (foundLog) break;
      }
      if (foundLog) setActiveLog(foundLog);
    }
  }

  function handleDragOver(event: DragOverEvent) {
    const { active, over } = event;
    if (!over || active.data.current?.type !== "log") {
      setOverSectionId(null);
      return;
    }

    const sourceSectionId = active.data.current?.sectionId;
    let targetId: string | undefined = over.data.current?.sectionId;
    if (!targetId && String(over.id).startsWith("section-")) {
      targetId = String(over.id).replace(/^section-/, "");
    }

    setOverSectionId(targetId && targetId !== sourceSectionId ? targetId : null);
  }

  async function handleDragEnd(event: DragEndEvent) {
    setActiveLog(null);
    setActiveSection(null);
    setOverSectionId(null);

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
          let draggedLog: EntryListItem | null = null;
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
      id="worklog-board"
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="flex h-full w-full overflow-x-auto p-4 sm:p-6 gap-4 items-start scrollbar-thin scrollbar-thumb-[#2e2f33] scroll-smooth">
        <SortableContext
          items={sectionsList.map((s) => `section-${s.id}`)}
          strategy={horizontalListSortingStrategy}
        >
          {sectionsList.map((sec) => (
            <SortableSectionItem
              key={sec.id}
              section={sec}
              isDropTarget={overSectionId === sec.id}
              onRefresh={onRefresh || (() => {})}
              onOpenEntry={(log) => pushEntryParam(log.id)}
            />
          ))}
        </SortableContext>

        {sectionsList.length === 0 && (
          <div className="flex h-full w-full flex-col items-center justify-center gap-3 py-20 text-center">
            <div className="relative mb-2 flex h-20 w-24 items-center justify-center">
              <div className="flex h-14 w-20 items-center justify-center rounded-2xl border border-[#3c4043] bg-[#28292c]">
                <ListChecks className="h-7 w-7 text-[#8ab4f8]" />
              </div>
            </div>
            <h3 className="text-[17px] font-semibold text-[#e8eaed]">No sections yet</h3>
            <p className="max-w-[280px] text-[13px] text-[#9aa0a6]">
              This date has no sections. Create one from the sidebar to start
              organizing logs here.
            </p>
          </div>
        )}
      </div>

      <DragOverlay>
        {activeSection ? (
          <div className="opacity-90 scale-[1.02] shadow-2xl">
            <SectionCard section={activeSection} />
          </div>
        ) : activeLog ? (
          <div className="flex items-center gap-2 rounded-2xl p-3.5 bg-[#1e1f20] border border-[#8ab4f8] shadow-2xl w-72 md:w-80 cursor-grabbing opacity-95">
            <div className="h-2 w-2 shrink-0 rounded-full bg-[#8ab4f8]" />
            <span className="text-[14px] font-semibold text-[#e8eaed] truncate">
              {activeLog.title || "Untitled log"}
            </span>
          </div>
        ) : null}
      </DragOverlay>

      <EntryDetailDialog
        entryId={openEntryId}
        sectionName={openEntrySectionName}
        onClose={() => pushEntryParam(null)}
      />
    </DndContext>
  );
}
