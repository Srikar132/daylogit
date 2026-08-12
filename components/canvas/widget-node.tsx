"use client";

import { NodeResizer, type NodeProps } from "@xyflow/react";
import { motion } from "framer-motion";
import { GripVertical } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { WidgetChromeProvider, type FloatingAction } from "@/components/canvas/widget-chrome-context";

export type WidgetNodeData = {
  title: string;
  canWrite: boolean;
  resizable?: boolean;
  render: () => React.ReactNode;
};

export function WidgetNode({ data, selected }: NodeProps) {
  const { title, render, resizable = true } = data as unknown as WidgetNodeData;
  const [entered, setEntered] = useState(false);
  const [floatingAction, setFloatingAction] = useState<FloatingAction | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  // Stepping "inside" a widget (double-click/double-tap) makes its body
  // directly interactive; clicking anywhere outside, or Escape, steps back
  // out. Repositioning the node itself is always available via the header
  // handle regardless of this state (see node.dragHandle below).
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

  return (
    <>
      {resizable && (
        <NodeResizer
          minWidth={320}
          minHeight={240}
          isVisible={selected}
          lineClassName="!border-[#8ab4f8]/50"
          handleClassName="!h-3 !w-3 !rounded-full !border-2 !border-[#8ab4f8] !bg-[#131314]"
        />
      )}

      {/* Unclipped outer wrapper — the floating action button (below) sits
          just outside the card's own bounds, so this level must not clip. */}
      <motion.div
        ref={rootRef}
        initial={false}
        whileHover={{ y: -1 }}
        transition={{ type: "spring", stiffness: 400, damping: 30 }}
        onDoubleClick={() => setEntered(true)}
        className="relative h-full w-full"
      >
        <div
          className={`flex h-full w-full flex-col overflow-hidden rounded-3xl border bg-[#131314] shadow-2xl transition-colors ${
            entered
              ? "border-[#8ab4f8]/70 ring-2 ring-[#8ab4f8]/25"
              : selected
                ? "border-[#8ab4f8]/60 ring-2 ring-[#8ab4f8]/20"
                : "border-white/[0.06]"
          }`}
        >
          {/* Header — always the drag surface for repositioning the node,
              regardless of entered state (see node.dragHandle). */}
          <div className="widget-drag-handle flex shrink-0 cursor-grab items-center gap-2 border-b border-white/[0.06] px-4 py-3 active:cursor-grabbing select-none">
            <GripVertical className="h-3.5 w-3.5 shrink-0 text-[#5f6368]" />
            <span className="truncate text-[13px] font-medium text-[#e8eaed]">{title}</span>
            {!entered && (
              <span className="ml-auto text-[11px] text-[#5f6368]">Double-click to interact</span>
            )}
          </div>

          {/* Body — inert (click-through to select/drag the frame) until
              "entered"; once entered it's "nodrag nowheel" so nested dnd-kit
              drags and scrolling aren't hijacked by the canvas's own pan/zoom. */}
          <div
            className={`nodrag nowheel min-h-0 flex-1 overflow-auto ${
              entered ? "cursor-auto" : "pointer-events-none cursor-default"
            }`}
          >
            <WidgetChromeProvider value={{ entered, setFloatingAction }}>
              {render()}
            </WidgetChromeProvider>
          </div>
        </div>

        {/* A widget opts into this via useWidgetChrome().setFloatingAction —
            rendered here, outside the card's own overflow-hidden, so it can
            actually sit past the corner instead of being clipped. */}
        {entered && floatingAction && (
          <button
            type="button"
            onClick={floatingAction.onClick}
            title={floatingAction.label}
            className="nodrag absolute right-0 top-full mt-2 flex h-8 w-8 items-center justify-center rounded-full border border-white/[0.08] bg-[#131314] text-[#8ab4f8] shadow-xl hover:bg-white/[0.06] cursor-pointer"
          >
            <floatingAction.icon className="h-4 w-4" />
          </button>
        )}
      </motion.div>
    </>
  );
}
