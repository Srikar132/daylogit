import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  FileText,
  GripVertical,
  MoreVertical,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { DeleteConfirmModal } from "@/components/delete-confirm-modal";
import { EditEntryModal } from "@/components/edit-entry-modal";
import type { EntryRow, SectionWithEntries } from "@/lib/worklog";

interface SectionCardProps {
  section: SectionWithEntries;
  onRefresh?: () => void;
  dragHandleProps?: Record<string, unknown>;
}

export function DraggableLogItem({
  log,
  sectionId,
  onRefresh,
}: {
  log: EntryRow;
  sectionId: string;
  onRefresh?: () => void;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isEditingModalOpen, setIsEditingModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
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
    <>
      <div
        ref={setNodeRef}
        style={style}
        onClick={() => setIsExpanded((prev) => !prev)}
        className="group flex cursor-pointer items-start gap-2.5 rounded-2xl p-3 bg-[#1e1f20]/60 border border-white/[0.04] transition-all hover:bg-[#1e1f20] hover:border-white/10 shadow-sm relative"
      >
        <div
          {...attributes}
          {...listeners}
          title="Drag log to move"
          className="mt-1 text-[#5f6368] opacity-0 group-hover:opacity-100 cursor-grab active:cursor-grabbing hover:text-[#8ab4f8] transition-opacity p-0.5 touch-none"
        >
          <GripVertical className="h-3.5 w-3.5" />
        </div>

        <div className="mt-1.5 h-2 w-2 rounded-full bg-[#8ab4f8] shrink-0 group-hover:bg-[#a8c7fa] transition-colors" />

        <div className="flex flex-1 flex-col min-w-0 pr-12">
          {log.title && (
            <span className="text-[14px] font-medium text-[#e8eaed] break-words mb-0.5">
              {log.title}
            </span>
          )}
          <div
            className={`text-[12.5px] text-[#c4c7c5] break-words whitespace-pre-wrap leading-relaxed transition-all ${
              isExpanded
                ? "max-h-60 overflow-y-auto pr-1 scrollbar-thin"
                : "line-clamp-2 group-hover:line-clamp-none group-hover:max-h-60 group-hover:overflow-y-auto group-hover:pr-1 group-hover:scrollbar-thin"
            }`}
          >
            {log.summary}
          </div>
          {log.date && (
            <div className="mt-2 flex items-center gap-2 flex-wrap">
              <span className="rounded-full bg-white/5 border border-white/10 px-2 py-0.5 text-[10.5px] text-[#9aa0a6]">
                {log.date}
              </span>
            </div>
          )}
        </div>

        {/* Hover Action Buttons for Editing & Deleting */}
        <div className="absolute right-2 top-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            type="button"
            title="Edit log details"
            onClick={(e) => {
              e.stopPropagation();
              setIsEditingModalOpen(true);
            }}
            className="rounded-full p-1 text-[#9aa0a6] hover:bg-white/10 hover:text-white cursor-pointer"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            title="Delete log"
            onClick={(e) => {
              e.stopPropagation();
              setIsDeleteModalOpen(true);
            }}
            className="rounded-full p-1 text-[#9aa0a6] hover:bg-white/10 hover:text-[#f28b82] cursor-pointer"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {isEditingModalOpen && (
        <EditEntryModal
          isOpen={isEditingModalOpen}
          onClose={() => {
            setIsEditingModalOpen(false);
            if (onRefresh) onRefresh();
          }}
          entry={log}
        />
      )}

      {isDeleteModalOpen && (
        <DeleteConfirmModal
          isOpen={isDeleteModalOpen}
          onClose={() => {
            setIsDeleteModalOpen(false);
            if (onRefresh) onRefresh();
          }}
          entry={log}
        />
      )}
    </>
  );
}

export function SectionCard({ section, onRefresh, dragHandleProps }: SectionCardProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [isRenamingSection, setIsRenamingSection] = useState(false);
  const [sectionTitleName, setSectionTitleName] = useState(section.name);
  const [title, setTitle] = useState("");
  const [details, setDetails] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setSectionTitleName(section.name);
  }, [section.name]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
    }
    if (showMenu) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showMenu]);

  const logsList = section.entries;

  async function handleCreateLog(e: React.FormEvent) {
    e.preventDefault();
    if (!details.trim() && !title.trim()) return;

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/entries/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim() || undefined,
          summary: details.trim() || title.trim(),
          sectionId: section.id,
          date: section.date || undefined,
        }),
      });

      if (res.ok) {
        setTitle("");
        setDetails("");
        setIsAdding(false);
        if (onRefresh) onRefresh();
      }
    } catch (err) {
      console.error("Failed to create log entry", err);
    } finally {
      setIsSubmitting(false);
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
    <div className="group/card flex w-80 md:w-[355px] shrink-0 flex-col rounded-3xl bg-[#131314] p-4 shadow-2xl border border-white/[0.06] transition-all">
      {/* Top Drag Handle Pill */}
      <div
        {...dragHandleProps}
        title="Drag list column to reorder"
        className="w-10 h-[3px] bg-[#5f6368] rounded-full mx-auto mb-2 opacity-0 group-hover/card:opacity-100 cursor-grab active:cursor-grabbing hover:bg-[#80868b] transition-all select-none"
      />

      {/* Header Bar */}
      <div className="flex items-center justify-between pb-3 select-none">
        {!isRenamingSection ? (
          <h2
            onDoubleClick={() => setIsRenamingSection(true)}
            title="Double-click to rename section"
            className="text-[17px] font-medium text-[#e8eaed] truncate max-w-[240px] cursor-pointer hover:text-white"
          >
            {section.name}
          </h2>
        ) : (
          <form onSubmit={handleSaveSectionName} className="flex-1 pr-2">
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

        <div className="relative" ref={menuRef}>
          <button
            type="button"
            onClick={() => setShowMenu((prev) => !prev)}
            className="rounded-full p-1.5 text-[#9aa0a6] hover:bg-white/10 hover:text-white cursor-pointer"
          >
            <MoreVertical className="h-4 w-4" />
          </button>
          {showMenu && (
            <div className="absolute right-0 top-8 z-30 w-44 rounded-xl border border-white/10 bg-[#1e1f20] py-1 text-[13px] text-[#e8eaed] shadow-2xl">
              <button
                type="button"
                onClick={() => {
                  setIsRenamingSection(true);
                  setShowMenu(false);
                }}
                className="flex w-full cursor-pointer items-center px-4 py-2 hover:bg-white/10"
              >
                Rename section
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsAdding(true);
                  setShowMenu(false);
                }}
                className="flex w-full cursor-pointer items-center px-4 py-2 hover:bg-white/10"
              >
                Add a log
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Inline Add Log Action Button */}
      {!isAdding ? (
        <button
          type="button"
          onClick={() => setIsAdding(true)}
          className="flex w-full cursor-pointer items-center gap-3 rounded-full bg-[#1e1f20] px-4 py-2.5 text-[13.5px] font-medium text-[#8ab4f8] transition-all hover:bg-[#28292c] active:scale-[0.99]"
        >
          <Plus className="h-4 w-4 stroke-[2.5]" />
          <span>Add a log</span>
        </button>
      ) : (
        /* Google Tasks Inline Quick-Add Card */
        <form
          onSubmit={handleCreateLog}
          className="rounded-2xl border border-white/10 bg-[#1e1f20] p-3 shadow-xl flex flex-col gap-2 my-1"
        >
          <div className="flex items-start gap-2.5">
            <FileText className="h-4 w-4 text-[#8ab4f8] mt-1 shrink-0" />
            <div className="flex flex-1 flex-col gap-1.5">
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Log Title"
                autoFocus
                className="w-full bg-transparent text-[14px] font-medium text-[#e8eaed] placeholder:text-[#9aa0a6] focus:outline-none"
              />
              <textarea
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                placeholder="Details (summary of work done)"
                rows={2}
                className="w-full resize-none bg-transparent text-[12.5px] text-[#c4c7c5] placeholder:text-[#80868b] focus:outline-none"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/5">
            <button
              type="button"
              onClick={() => {
                setIsAdding(false);
                setTitle("");
                setDetails("");
              }}
              className="rounded-full px-3 py-1 text-[12px] font-medium text-[#9aa0a6] hover:bg-white/10 hover:text-white cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || (!title.trim() && !details.trim())}
              className="rounded-full bg-[#8ab4f8] px-4 py-1 text-[12px] font-semibold text-[#141414] transition-all hover:bg-[#a8c7fa] disabled:opacity-50 cursor-pointer"
            >
              Save
            </button>
          </div>
        </form>
      )}

      {/* Log List Content */}
      <div className="mt-3 flex flex-1 flex-col gap-1.5 overflow-y-auto max-h-[540px] pr-1 scrollbar-thin">
        {logsList.length === 0 && !isAdding ? (
          /* Google Tasks Empty State Illustration */
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
              Add your work logs to keep track of daily progress across DayLog
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
                onRefresh={onRefresh}
              />
            ))}
          </SortableContext>
        )}
      </div>
    </div>
  );
}
