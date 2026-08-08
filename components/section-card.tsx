"use client";

import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import type { EntryListItem, SectionWithEntries } from "@/lib/worklog";

const SECTION_MIN_HEIGHT = 420;

interface SectionCardProps {
  section: SectionWithEntries;
  onRefresh?: () => void;
  dragHandleProps?: Record<string, unknown>;
  isDropTarget?: boolean;
  onOpenEntry?: (log: EntryListItem) => void;
}

// Title-only row — the list never fetches (or holds) a summary at all (see
// lib/worklog.ts's EntryListItem); the full body only ever loads inside
// EntryDetailDialog, lazily, for the one entry actually clicked. So there's
// nothing to expand/collapse here anymore, just a click straight to the dialog.
export function DraggableLogItem({
  log,
  sectionId,
  onOpen,
}: {
  log: EntryListItem;
  sectionId: string;
  onOpen?: (log: EntryListItem) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({
      id: `log-${log.id}`,
      data: {
        type: "log",
        logId: log.id,
        sectionId,
      },
    });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : 1,
    zIndex: isDragging ? 50 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="group">
      <button
        type="button"
        onClick={() => onOpen?.(log)}
        className="flex w-full cursor-pointer items-center gap-2.5 rounded-2xl border border-white/[0.06] bg-white/[0.02] px-3 py-2.5 text-left transition-colors hover:border-white/[0.12] hover:bg-white/[0.045]"
      >
        <div
          {...attributes}
          {...listeners}
          title="Drag log to move"
          className="shrink-0 text-[#5f6368] opacity-0 group-hover:opacity-100 cursor-grab active:cursor-grabbing hover:text-[#8ab4f8] transition-opacity touch-none"
        >
          <GripVertical className="h-3.5 w-3.5" />
        </div>

        <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-[#e8eaed]">
          {log.title || "Untitled log"}
        </span>
      </button>
    </div>
  );
}

export function SectionCard({
  section,
  onRefresh,
  dragHandleProps,
  isDropTarget,
  onOpenEntry,
}: SectionCardProps) {
  const [isRenamingSection, setIsRenamingSection] = useState(false);
  const [sectionTitleName, setSectionTitleName] = useState(section.name);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    setSectionTitleName(section.name);
  }, [section.name]);

  const logsList = section.entries;
  const isEmpty = logsList.length === 0;

  async function handleDeleteSection() {
    if (!isEmpty || isDeleting) return;
    if (!window.confirm(`Delete "${section.name}"? This can't be undone.`)) return;

    setIsDeleting(true);
    try {
      const res = await fetch("/api/sections", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: section.id }),
      });
      if (res.ok && onRefresh) onRefresh();
    } catch (err) {
      console.error("Failed to delete section", err);
    } finally {
      setIsDeleting(false);
    }
  }

  async function handleSaveSectionName(e: React.FormEvent) {
    e.preventDefault();
    if (!sectionTitleName.trim() || sectionTitleName.trim() === section.name) {
      setIsRenamingSection(false);
      setSectionTitleName(section.name);
      return;
    }

    try {
      const res = await fetch("/api/sections", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: section.id,
          name: sectionTitleName.trim(),
        }),
      });

      if (res.ok) {
        setIsRenamingSection(false);
        if (onRefresh) onRefresh();
      }
    } catch (err) {
      console.error("Failed to rename section", err);
    }
  }

  return (
    <div
      className={`group/card flex w-80 md:w-[355px] shrink-0 flex-col rounded-3xl bg-[#131314] p-4 shadow-2xl border transition-all ${
        isDropTarget ? "border-[#8ab4f8]/70 ring-2 ring-[#8ab4f8]/30" : "border-white/[0.06]"
      }`}
    >
      {/* Top Drag Handle Pill */}
      <div
        {...dragHandleProps}
        title="Drag list column to reorder"
        className="w-10 h-[3px] bg-[#5f6368] rounded-full mx-auto mb-2 opacity-0 group-hover/card:opacity-100 cursor-grab active:cursor-grabbing hover:bg-[#80868b] transition-all select-none"
      />

      {/* Header Bar */}
      <div className="flex items-center gap-2 pb-3 select-none">
        {!isRenamingSection ? (
          <h2
            onDoubleClick={() => setIsRenamingSection(true)}
            title="Double-click to rename section"
            className="min-w-0 flex-1 truncate text-[17px] font-medium text-[#e8eaed] cursor-pointer hover:text-white"
          >
            {section.name}
          </h2>
        ) : (
          <form onSubmit={handleSaveSectionName} className="flex-1">
            <input
              type="text"
              value={sectionTitleName}
              onChange={(e) => setSectionTitleName(e.target.value)}
              onBlur={handleSaveSectionName}
              autoFocus
              className="w-full bg-[#1e1f20] px-2 py-0.5 text-[15px] font-medium text-[#e8eaed] rounded-lg border border-[#8ab4f8] focus:outline-none"
            />
          </form>
        )}

        {isEmpty && !isRenamingSection && (
          <button
            type="button"
            title="Delete empty section"
            onClick={handleDeleteSection}
            disabled={isDeleting}
            className="shrink-0 rounded-full p-1.5 text-[#5f6368] opacity-0 transition-all group-hover/card:opacity-100 hover:bg-[#f28b82]/10 hover:text-[#f28b82] disabled:opacity-50 cursor-pointer"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Log List Content — fixed min-height so a 1-entry section reads the
          same size as a full one; only grows past max-height via scroll. */}
      <div
        style={{ minHeight: SECTION_MIN_HEIGHT }}
        className="mt-1 flex flex-1 flex-col gap-1.5 overflow-y-auto max-h-[540px] pr-1 scrollbar-thin"
      >
        {logsList.length === 0 ? (
          /* Empty-section illustration */
          <div className="my-auto flex flex-col items-center justify-center py-10 text-center">
            <div className="relative mb-3 flex h-16 w-20 items-center justify-center">
              <div className="h-10 w-16 rounded-lg bg-[#28292c] border border-[#3c4043] flex items-center justify-center">
                <div className="h-2 w-10 rounded-full bg-[#8ab4f8]" />
              </div>
              <div className="absolute -top-1 -left-1 flex h-5 w-5 items-center justify-center rounded-full bg-[#f28b82] text-white text-[10px]">
                ✓
              </div>
            </div>
            <h3 className="text-[15px] font-semibold text-[#e8eaed]">
              No logs yet
            </h3>
            <p className="mt-1 text-[12px] text-[#9aa0a6] max-w-[200px]">
              Logs added here (via Claude) will show up automatically
            </p>
          </div>
        ) : (
          <SortableContext
            items={logsList.map((log) => `log-${log.id}`)}
            strategy={verticalListSortingStrategy}
          >
            {logsList.map((log) => (
              <DraggableLogItem
                key={log.id}
                log={log}
                sectionId={section.id}
                onOpen={onOpenEntry}
              />
            ))}
          </SortableContext>
        )}

        {isDropTarget && (
          <div className="flex shrink-0 items-center justify-center rounded-2xl border-2 border-dashed border-[#8ab4f8]/60 bg-[#8ab4f8]/5 py-4 text-[12.5px] font-medium text-[#8ab4f8]">
            Drop here
          </div>
        )}
      </div>
    </div>
  );
}
