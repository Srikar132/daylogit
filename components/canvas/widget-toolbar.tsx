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
  onAdd: (type: string) => void;
}

function ToolbarItem({ type, label, icon: Icon, disabled, onAdd }: ToolbarItemProps) {
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
      title={`Tap to add a ${label}, or drag it onto the canvas`}
      aria-label={`Add a ${label}`}
      disabled={disabled}
      // Tapping did nothing at all before — dragging was the only way to add a
      // widget, which is the wrong primary gesture on a phone. A tap drops it in
      // the middle of the current view; dragging still places it exactly.
      // MouseSensor needs 4px of movement to start a drag, so a real drag ends
      // with the pointer off this button and never fires a click.
      onClick={() => onAdd(type)}
      // A press-and-hold on mobile otherwise raises the text-selection callout
      // (and on iOS the link/image menu), which takes over the gesture before
      // the touch sensor's delay elapses. touch-manipulation also drops the
      // 300ms double-tap-zoom wait without disabling scroll, so the toolbar can
      // still be swiped.
      style={{ WebkitTouchCallout: "none" }}
      className={`flex h-11 w-11 shrink-0 select-none touch-manipulation items-center justify-center rounded-xl border border-white/[0.06] bg-white/[0.03] text-zinc-400 transition-colors hover:border-white/20 hover:bg-white/[0.08] hover:text-white disabled:pointer-events-none disabled:opacity-40 ${
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
  onAdd: (type: string) => void;
}

/** Screen-fixed vertical toolbar, right edge — drag an icon onto the canvas
 *  to spawn that widget type at the drop point, or tap one to drop it into the
 *  middle of the current view. Height hugs its content up
 *  to a viewport-relative cap, scrolling internally past that so it never
 *  overflows the screen as more widget types are added. */
export function WidgetToolbar({ canWrite, onAdd }: WidgetToolbarProps) {
  if (!canWrite) return null;

  return (
    <div className="pointer-events-none fixed inset-y-4 right-[max(1rem,env(safe-area-inset-right))] z-20 flex items-center">
      <div className="pointer-events-auto flex max-h-full flex-col gap-1.5 overflow-y-auto scrollbar-thin rounded-2xl border border-white/[0.08] bg-[#131314]/90 p-2 shadow-2xl backdrop-blur-md">
        {ADDABLE_WIDGET_TYPES.map((widget) => (
          <ToolbarItem key={widget.type} {...widget} disabled={!canWrite} onAdd={onAdd} />
        ))}
      </div>
    </div>
  );
}
