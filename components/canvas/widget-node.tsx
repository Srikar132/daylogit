"use client";

import { NodeResizer, type NodeProps } from "@xyflow/react";
import { motion } from "framer-motion";
import { GripVertical } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { WidgetChromeProvider, type FloatingAction } from "@/components/canvas/widget-chrome-context";
import { BoardWidget } from "@/components/canvas/board-widget";
import { MailSummaryWidget } from "@/components/canvas/mail-summary-widget";
import { MarkdownWidget } from "@/components/canvas/markdown-widget";
import { MediaWidget } from "@/components/canvas/media-widget";
import { ProjectDocWidget } from "@/components/canvas/project-doc-widget";
import type { BoardColumn } from "@/lib/worklog";

export type WidgetNodeData = {
  title: string;
  canWrite: boolean;
  resizable?: boolean;
  /** Content-driven height floor, in px — see canvas-shell's AUTO_HEIGHT_MIN.
   *  Applied directly on the card's own flex container, not an ancestor:
   *  min-height on a percentage-sized ancestor doesn't stretch percentage
   *  children to fill it (they resolve as `auto` per spec), so the floor
   *  has to live on the box that actually needs to grow. */
  minHeight?: number;
  /** Skips the double-click-to-enter gating — the body is interactive right
   *  away. For widgets like media, where right-click/video controls need to
   *  work immediately rather than after an extra double-click step. */
  alwaysInteractive?: boolean;
  /** No header bar, no border/background card — just the content filling
   *  the node. There's no ".widget-drag-handle" for these (see canvas-shell:
   *  dragHandle is omitted so the whole node is grabbable instead). */
  chromeless?: boolean;
  widgetType: string;
  widgetData?: Record<string, unknown>;
  /** Only populated for type "board". */
  columns?: BoardColumn[];
  /** Only populated for type "project-doc" — needed for the MANAGE link. */
  slug?: string;
};

// Dispatches on the node's OWN live `data` prop rather than a closure baked
// in at node-creation time — a closure captured once would never see later
// updates from updateWidgetData (this bit media widgets: upload completion
// updates data.widgetData, but a frozen `render()` closure kept showing the
// original "uploading" snapshot forever).
function renderWidgetBody(id: string, data: WidgetNodeData): React.ReactNode {
  switch (data.widgetType) {
    case "board":
      return <BoardWidget columns={data.columns ?? []} canWrite={data.canWrite} />;
    case "mail-summary":
      return <MailSummaryWidget />;
    case "markdown":
      return <MarkdownWidget id={id} initialContent={data.widgetData} canWrite={data.canWrite} />;
    case "media":
      return <MediaWidget id={id} data={data.widgetData} canWrite={data.canWrite} />;
    case "project-doc": {
      const docProjectId = data.widgetData?.docProjectId;
      return (
        <ProjectDocWidget
          id={id}
          docProjectId={typeof docProjectId === "string" ? docProjectId : undefined}
          slug={data.slug}
          canWrite={data.canWrite}
        />
      );
    }
    default:
      return null;
  }
}

export function WidgetNode({ id, data, selected }: NodeProps) {
  const widgetData = data as unknown as WidgetNodeData;
  const {
    title,
    resizable = true,
    minHeight,
    alwaysInteractive = false,
    chromeless = false,
  } = widgetData;
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

  if (chromeless) {
    return (
      <>
        {resizable && (
          <NodeResizer
            minWidth={120}
            minHeight={80}
            isVisible={selected}
            lineClassName="!border-[#8ab4f8]/50"
            handleClassName="!hidden"
          />
        )}
        <div className="h-full w-full overflow-hidden rounded-2xl">
          <WidgetChromeProvider value={{ entered: true, setFloatingAction }}>
            {renderWidgetBody(id, widgetData)}
          </WidgetChromeProvider>
        </div>
      </>
    );
  }

  return (
    <>
      {resizable && (
        <NodeResizer
          minWidth={320}
          minHeight={240}
          isVisible={selected}
          lineClassName="!border-[#8ab4f8]/50"
          handleClassName="!hidden"
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
          style={minHeight ? { minHeight } : undefined}
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
            {!entered && !alwaysInteractive && (
              <span className="ml-auto text-[11px] text-[#5f6368]">Double-click to interact</span>
            )}
          </div>

          {/* Body — inert (click-through to select/drag the frame) until
              "entered"; once entered it's "nodrag nowheel" so nested dnd-kit
              drags and scrolling aren't hijacked by the canvas's own pan/zoom.
              alwaysInteractive widgets skip this gating entirely. */}
          <div
            className={`nodrag nowheel min-h-0 flex-1 overflow-auto ${
              entered || alwaysInteractive ? "cursor-auto" : "pointer-events-none cursor-default"
            }`}
          >
            <WidgetChromeProvider value={{ entered: entered || alwaysInteractive, setFloatingAction }}>
              {renderWidgetBody(id, widgetData)}
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
