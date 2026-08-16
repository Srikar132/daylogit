"use client";

import { useDraggable } from "@dnd-kit/core";
import { Bookmark, FolderGit2, Images, NotebookPen } from "lucide-react";

export interface AddableWidgetType {
  type: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

export const ADDABLE_WIDGET_TYPES: AddableWidgetType[] = [
  { type: "markdown", label: "Note", icon: NotebookPen },
  { type: "project-doc", label: "Project Doc", icon: FolderGit2 },
  { type: "bookmark", label: "Bookmark", icon: Bookmark },
  { type: "gallery", label: "Gallery", icon: Images },
  // More widget types land here over time — each just adds an icon.
];

interface ToolbarItemProps extends AddableWidgetType {
  disabled: boolean;
}

function ToolbarItem({ type, label, icon: Icon, disabled }: ToolbarItemProps) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `toolbar-${type}`,
    data: { widgetType: type },
    disabled,
  });

  return (
    <button
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      type="button"
      title={`Drag to add a ${label}`}
      disabled={disabled}
      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/[0.06] bg-white/[0.03] text-zinc-400 transition-colors hover:border-white/20 hover:bg-white/[0.08] hover:text-white disabled:pointer-events-none disabled:opacity-40 ${
        isDragging ? "cursor-grabbing opacity-30" : "cursor-grab"
      }`}
    >
      <Icon className="h-[18px] w-[18px]" />
    </button>
  );
}

/** Drag icon: rendered inside <DragOverlay>, follows the cursor. */
export function ToolbarDragGhost({ type }: { type: string }) {
  const widget = ADDABLE_WIDGET_TYPES.find((t) => t.type === type);
  if (!widget) return null;
  const Icon = widget.icon;
  return (
    <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/30 bg-[#18181c] text-white shadow-2xl ring-2 ring-white/20">
      <Icon className="h-[18px] w-[18px]" />
    </div>
  );
}

interface WidgetToolbarProps {
  canWrite: boolean;
}

/** Screen-fixed vertical toolbar, right edge — drag an icon onto the canvas
 *  to spawn that widget type at the drop point. Height hugs its content up
 *  to a viewport-relative cap, scrolling internally past that so it never
 *  overflows the screen as more widget types are added. */
export function WidgetToolbar({ canWrite }: WidgetToolbarProps) {
  if (!canWrite) return null;

  return (
    <div className="pointer-events-none fixed inset-y-4 right-[max(1rem,env(safe-area-inset-right))] z-20 flex items-center">
      <div className="pointer-events-auto flex max-h-full flex-col gap-1.5 overflow-y-auto scrollbar-thin rounded-2xl border border-white/[0.08] bg-[#131314]/90 p-2 shadow-2xl backdrop-blur-md">
        {ADDABLE_WIDGET_TYPES.map((widget) => (
          <ToolbarItem key={widget.type} {...widget} disabled={!canWrite} />
        ))}
      </div>
    </div>
  );
}
