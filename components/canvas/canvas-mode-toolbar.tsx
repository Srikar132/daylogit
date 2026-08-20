"use client";

import { Eraser, Hand, Highlighter, MousePointer2, Pencil, RotateCcw, RotateCw, Sparkles } from "lucide-react";
import { useCanvasMode } from "@/components/canvas/canvas-mode-context";
import type { CanvasMode } from "@/lib/canvas/widget-interaction";

const MODES: Array<{
  mode: CanvasMode;
  label: string;
  hint: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  {
    mode: "select",
    label: "Select",
    hint: "Select — click a widget to use it, drag the canvas to marquee-select (hold Space to pan)",
    icon: MousePointer2,
  },
  { mode: "grab", label: "Grab", hint: "Grab — drag anywhere to pan the canvas", icon: Hand },
  {
    mode: "draw",
    label: "Draw",
    hint: "Draw Mode — freehand pen & highlighter annotations saved to workspace",
    icon: Pencil,
  },
  {
    mode: "laser",
    label: "Laser Pointer",
    hint: "Laser Pointer — temporary glowing red ink that disappears 1s after drawing",
    icon: Sparkles,
  },
];

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

  const showDrawingSubbar = mode === "draw" || mode === "laser";
  const showColors = mode === "draw" && activeTool !== "eraser";

  return (
    <div className="pointer-events-none fixed inset-y-4 left-[max(1rem,env(safe-area-inset-left))] z-20 flex items-center gap-2">
      {/* Primary Mode Selector */}
      <div className="pointer-events-auto flex flex-col gap-1.5 rounded-2xl border border-white/[0.08] bg-[#131314]/90 p-2 shadow-2xl backdrop-blur-md">
        {MODES.map(({ mode: value, label, hint, icon: Icon }) => (
          <button
            key={value}
            type="button"
            title={hint}
            aria-label={label}
            aria-pressed={mode === value}
            onClick={() => {
              setMode(value);
              if (value === "draw" && activeTool === "laser") setActiveTool("pen");
              if (value === "laser") setActiveTool("laser");
            }}
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border transition-all cursor-pointer ${
              mode === value
                ? "border-white/25 bg-white/[0.12] text-white shadow-inner"
                : "border-white/[0.06] bg-white/[0.03] text-zinc-400 hover:border-white/20 hover:bg-white/[0.08] hover:text-white"
            }`}
          >
            <Icon className="h-[18px] w-[18px]" />
          </button>
        ))}
      </div>

      {/* Drawing Tool Settings Sub-Toolbar */}
      {showDrawingSubbar && (
        <div className="pointer-events-auto flex flex-col gap-2 rounded-2xl border border-white/[0.08] bg-[#131314]/95 p-2.5 shadow-2xl backdrop-blur-md animate-in fade-in slide-in-from-left-2 duration-150">
          {/* Tool selector */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              title="Pen"
              onClick={() => {
                setMode("draw");
                setActiveTool("pen");
              }}
              className={`flex h-8 w-8 items-center justify-center rounded-lg border transition-colors cursor-pointer ${
                mode === "draw" && activeTool === "pen"
                  ? "border-white/30 bg-white/15 text-white"
                  : "border-transparent text-zinc-400 hover:bg-white/5 hover:text-white"
              }`}
            >
              <Pencil className="h-4 w-4" />
            </button>

            <button
              type="button"
              title="Highlighter"
              onClick={() => {
                setMode("draw");
                setActiveTool("highlighter");
              }}
              className={`flex h-8 w-8 items-center justify-center rounded-lg border transition-colors cursor-pointer ${
                mode === "draw" && activeTool === "highlighter"
                  ? "border-white/30 bg-white/15 text-white"
                  : "border-transparent text-zinc-400 hover:bg-white/5 hover:text-white"
              }`}
            >
              <Highlighter className="h-4 w-4" />
            </button>

            <button
              type="button"
              title="Eraser (click or sweep over line to delete)"
              onClick={() => {
                setMode("draw");
                setActiveTool("eraser");
              }}
              className={`flex h-8 w-8 items-center justify-center rounded-lg border transition-colors cursor-pointer ${
                mode === "draw" && activeTool === "eraser"
                  ? "border-white/30 bg-white/15 text-white"
                  : "border-transparent text-zinc-400 hover:bg-white/5 hover:text-white"
              }`}
            >
              <Eraser className="h-4 w-4" />
            </button>

            <button
              type="button"
              title="Laser Pointer (temporary crimson ink)"
              onClick={() => {
                setMode("laser");
                setActiveTool("laser");
              }}
              className={`flex h-8 w-8 items-center justify-center rounded-lg border transition-colors cursor-pointer ${
                mode === "laser"
                  ? "border-white/30 bg-white/15 text-white"
                  : "border-transparent text-zinc-400 hover:bg-white/5 hover:text-white"
              }`}
            >
              <Sparkles className="h-4 w-4" />
            </button>

            {/* Undo & Redo Actions */}
            {mode === "draw" && (
              <div className="flex items-center gap-1 border-l border-white/[0.08] pl-1 ml-0.5">
                <button
                  type="button"
                  title="Undo Draw (Ctrl+Z)"
                  disabled={!canUndo}
                  onClick={undoDraw}
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-transparent text-zinc-400 hover:bg-white/5 hover:text-white disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                </button>

                <button
                  type="button"
                  title="Redo Draw (Ctrl+Y)"
                  disabled={!canRedo}
                  onClick={redoDraw}
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-transparent text-zinc-400 hover:bg-white/5 hover:text-white disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
                >
                  <RotateCw className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
          </div>

          {/* Color Chips (Only shown in Draw Mode) */}
          {showColors && (
            <div className="grid grid-cols-4 gap-1.5 pt-1.5 border-t border-white/[0.06]">
              {COLORS.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  title={c.label}
                  onClick={() => setStrokeColor(c.value)}
                  className={`h-5 w-5 rounded-full border transition-transform cursor-pointer justify-self-center ${
                    strokeColor === c.value
                      ? "scale-110 border-white ring-2 ring-white/50"
                      : "border-white/10 opacity-80 hover:opacity-100 hover:scale-105"
                  }`}
                  style={{ backgroundColor: c.value }}
                />
              ))}
            </div>
          )}

          {/* Stroke Width Selector (Only shown in Draw Mode) */}
          {showColors && (
            <div className="flex items-center justify-between gap-1 pt-1 border-t border-white/[0.06]">
              {SIZES.map((s) => (
                <button
                  key={s.value}
                  type="button"
                  onClick={() => setStrokeWidth(s.value)}
                  className={`flex h-6 px-2 items-center justify-center rounded-md text-[10.5px] font-semibold transition-colors cursor-pointer ${
                    strokeWidth === s.value
                      ? "bg-white/20 text-white"
                      : "text-zinc-400 hover:bg-white/5 hover:text-white"
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
