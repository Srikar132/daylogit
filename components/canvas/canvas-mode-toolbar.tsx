"use client";

import { useReactFlow, useViewport } from "@xyflow/react";
import {
  Eraser,
  Hand,
  Highlighter,
  Maximize2,
  Minus,
  MousePointer2,
  Pencil,
  Plus,
  RotateCcw,
  RotateCw,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCanvasMode } from "@/components/canvas/canvas-mode-context";

const COLORS = [
  { label: "Yellow", value: "#f7ce15" },
  { label: "Orange", value: "#fd5e00" },
  { label: "Red", value: "#FF2D2D" },
  { label: "Green", value: "#059669" },
  { label: "Blue", value: "#2563EB" },
  { label: "Purple", value: "#7C3AED" },
  { label: "White", value: "#FFFFFF" },
  { label: "Zinc Dark", value: "#18181B" },
];

const SIZES = [
  { label: "S", value: 3 },
  { label: "M", value: 6 },
  { label: "L", value: 12 },
];

export function CanvasModeToolbar() {
  const {
    mode,
    setMode,
    activeTool,
    setActiveTool,
    strokeColor,
    setStrokeColor,
    strokeWidth,
    setStrokeWidth,
    canUndo,
    canRedo,
    undoDraw,
    redoDraw,
  } = useCanvasMode();

  const { zoomIn, zoomOut, fitView, setViewport } = useReactFlow();
  const viewport = useViewport();
  const zoomPercentage = Math.round(viewport.zoom * 100);

  const showColors = mode === "draw" && activeTool !== "eraser";

  return (
    <div className="pointer-events-none fixed bottom-3 left-2 right-2 sm:left-4 sm:right-auto z-30 flex flex-col gap-1.5 items-start max-w-[calc(100vw-1rem)]">
      {/* Floating Property Bar (Colors & Sizes) */}
      {showColors && (
        <div className="pointer-events-auto flex max-w-full items-center gap-2.5 overflow-x-auto scrollbar-none rounded-[12px] border border-white/10 bg-zinc-900/95 px-2.5 py-1.5 shadow-2xl backdrop-blur-md animate-in fade-in slide-in-from-bottom-2 duration-150">
          {/* Color Chips */}
          <div className="flex items-center gap-1.5 shrink-0">
            {COLORS.map((c) => (
              <button
                key={c.value}
                type="button"
                title={c.label}
                onClick={() => setStrokeColor(c.value)}
                className={`h-4.5 w-4.5 rounded-full border transition-all cursor-pointer ${
                  strokeColor === c.value
                    ? "scale-110 border-white ring-2 ring-white/50"
                    : "border-white/10 opacity-75 hover:opacity-100 hover:scale-105"
                }`}
                style={{ backgroundColor: c.value }}
              />
            ))}
          </div>

          <div className="h-4 w-[1px] bg-white/10 shrink-0" />

          {/* Stroke Width Selector */}
          <div className="flex items-center gap-1 shrink-0">
            {SIZES.map((s) => (
              <Button
                key={s.value}
                type="button"
                variant={strokeWidth === s.value ? "secondary" : "ghost"}
                size="xs"
                shape="rounded"
                onClick={() => setStrokeWidth(s.value)}
                className="px-1.5 text-[11px]"
              >
                {s.label}
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* Main Whimsical Horizontal Bottom Dock (100% Mobile Responsive) */}
      <div className="pointer-events-auto flex max-w-full items-center gap-1.5 overflow-x-auto scrollbar-none rounded-[14px] border border-white/10 bg-zinc-900/95 p-1 shadow-2xl backdrop-blur-md">
        {/* Section 1: Pointer & Grab Modes */}
        <div className="flex items-center gap-0.5 shrink-0">
          <Button
            type="button"
            title="Select (click widget / marquee select)"
            aria-label="Select Mode"
            variant={mode === "select" ? "secondary" : "ghost"}
            size="icon-sm"
            shape="rounded"
            onClick={() => setMode("select")}
          >
            <MousePointer2 className="h-4 w-4" />
          </Button>

          <Button
            type="button"
            title="Grab (pan canvas)"
            aria-label="Grab Mode"
            variant={mode === "grab" ? "secondary" : "ghost"}
            size="icon-sm"
            shape="rounded"
            onClick={() => setMode("grab")}
          >
            <Hand className="h-4 w-4" />
          </Button>
        </div>

        <div className="h-4 w-[1px] bg-white/10 shrink-0" />

        {/* Section 2: Drawing Tools (Pen, Highlighter, Eraser, Laser) */}
        <div className="flex items-center gap-0.5 shrink-0">
          <Button
            type="button"
            title="Pen"
            aria-label="Pen Tool"
            variant={mode === "draw" && activeTool === "pen" ? "secondary" : "ghost"}
            size="icon-sm"
            shape="rounded"
            onClick={() => {
              setMode("draw");
              setActiveTool("pen");
            }}
          >
            <Pencil className="h-4 w-4" />
          </Button>

          <Button
            type="button"
            title="Highlighter"
            aria-label="Highlighter Tool"
            variant={mode === "draw" && activeTool === "highlighter" ? "secondary" : "ghost"}
            size="icon-sm"
            shape="rounded"
            onClick={() => {
              setMode("draw");
              setActiveTool("highlighter");
            }}
          >
            <Highlighter className="h-4 w-4" />
          </Button>

          <Button
            type="button"
            title="Eraser (click or sweep over stroke to delete)"
            aria-label="Eraser Tool"
            variant={mode === "draw" && activeTool === "eraser" ? "secondary" : "ghost"}
            size="icon-sm"
            shape="rounded"
            onClick={() => {
              setMode("draw");
              setActiveTool("eraser");
            }}
          >
            <Eraser className="h-4 w-4" />
          </Button>

          <Button
            type="button"
            title="Laser Pointer (temporary red ink disappears after 1s)"
            aria-label="Laser Pointer"
            variant={mode === "laser" ? "destructive" : "ghost"}
            size="icon-sm"
            shape="rounded"
            onClick={() => {
              setMode("laser");
              setActiveTool("laser");
            }}
          >
            <Sparkles className="h-4 w-4 text-red-400" />
          </Button>
        </div>

        <div className="h-4 w-[1px] bg-white/10 shrink-0" />

        {/* Section 3: History (Undo / Redo) */}
        <div className="flex items-center gap-0.5 shrink-0">
          <Button
            type="button"
            title="Undo (Ctrl+Z)"
            disabled={!canUndo}
            variant="ghost"
            size="icon-sm"
            shape="rounded"
            onClick={undoDraw}
          >
            <RotateCcw className="h-4 w-4" />
          </Button>

          <Button
            type="button"
            title="Redo (Ctrl+Y)"
            disabled={!canRedo}
            variant="ghost"
            size="icon-sm"
            shape="rounded"
            onClick={redoDraw}
          >
            <RotateCw className="h-4 w-4" />
          </Button>
        </div>

        <div className="h-4 w-[1px] bg-white/10 shrink-0" />

        {/* Section 4: Zoom Controls [ - | 100% | + | ⛶ ] */}
        <div className="flex items-center gap-0.5 shrink-0">
          <Button
            type="button"
            title="Zoom Out"
            variant="ghost"
            size="icon-sm"
            shape="rounded"
            onClick={() => zoomOut()}
          >
            <Minus className="h-4 w-4" />
          </Button>

          <Button
            type="button"
            title="Reset Zoom to 100%"
            variant="ghost"
            size="sm"
            shape="rounded"
            onClick={() => setViewport({ x: viewport.x, y: viewport.y, zoom: 1 })}
            className="px-1.5 text-xs font-semibold"
          >
            {zoomPercentage}%
          </Button>

          <Button
            type="button"
            title="Zoom In"
            variant="ghost"
            size="icon-sm"
            shape="rounded"
            onClick={() => zoomIn()}
          >
            <Plus className="h-4 w-4" />
          </Button>

          <Button
            type="button"
            title="Fit View"
            variant="ghost"
            size="icon-sm"
            shape="rounded"
            onClick={() => fitView({ padding: 0.15 })}
          >
            <Maximize2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
