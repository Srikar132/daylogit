"use client";

import { LayoutGrid, NotebookPen } from "lucide-react";
import { useEffect, useRef, useState } from "react";

export interface AddableWidgetType {
  type: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

export const ADDABLE_WIDGET_TYPES: AddableWidgetType[] = [
  { type: "markdown", label: "Note", icon: NotebookPen },
  // More widget types land here over time — each just adds a square.
];

interface AddWidgetCardProps {
  onAdd: (type: string) => void;
  canWrite: boolean;
}

/** Pinned at canvas (0,0) — the workspace's command center for spawning new
 *  (multi-instance) widgets. Not draggable/resizable, never persisted.
 *  Same double-click-to-enter gating as WidgetNode: body is inert until
 *  entered, so a stray single click here falls through to canvas pan
 *  instead of being mistaken for a click on a button. */
export function AddWidgetCard({ onAdd, canWrite }: AddWidgetCardProps) {
  const [entered, setEntered] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!entered) return;

    function handlePointerDown(e: PointerEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setEntered(false);
      }
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setEntered(false);
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [entered]);

  if (!canWrite) return null;

  return (
    <div
      ref={rootRef}
      onDoubleClick={() => setEntered(true)}
      className={`nodrag nowheel nopan flex w-[220px] flex-col gap-3 rounded-2xl border bg-[#131314] p-4 shadow-2xl transition-colors ${
        entered ? "border-[#8ab4f8]/70 ring-2 ring-[#8ab4f8]/25" : "border-white/[0.08]"
      }`}
    >
      <div className="flex items-center gap-2">
        <LayoutGrid className="h-4 w-4 shrink-0 text-[#8ab4f8]" />
        <span className="truncate text-[12.5px] font-medium text-[#e8eaed]">Command Center</span>
        {!entered && (
          <span className="ml-auto text-[9.5px] text-[#5f6368]">Double-click</span>
        )}
      </div>
      <div
        className={`grid grid-cols-3 gap-2 ${entered ? "" : "pointer-events-none"}`}
      >
        {ADDABLE_WIDGET_TYPES.map(({ type, label, icon: Icon }) => (
          <button
            key={type}
            type="button"
            onClick={() => onAdd(type)}
            title={`Add ${label}`}
            className="flex aspect-square flex-col items-center justify-center gap-1 rounded-xl border border-white/[0.06] bg-white/[0.03] text-[#9aa0a6] transition-colors hover:border-[#8ab4f8]/40 hover:bg-white/[0.06] hover:text-[#e8eaed] cursor-pointer"
          >
            <Icon className="h-4 w-4" />
            <span className="text-[9.5px]">{label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
