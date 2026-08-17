"use client";

import { Hand, MousePointer2 } from "lucide-react";
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
];

/** Screen-fixed mode switch, left edge. Mirrors the widget toolbar on the
 *  right; shown to read-only viewers too, since panning isn't a write. */
export function CanvasModeToolbar() {
  const { mode, setMode } = useCanvasMode();

  return (
    <div className="pointer-events-none fixed inset-y-4 left-[max(1rem,env(safe-area-inset-left))] z-20 flex items-center">
      <div className="pointer-events-auto flex flex-col gap-1.5 rounded-2xl border border-white/[0.08] bg-[#131314]/90 p-2 shadow-2xl backdrop-blur-md">
        {MODES.map(({ mode: value, label, hint, icon: Icon }) => (
          <button
            key={value}
            type="button"
            title={hint}
            aria-label={label}
            aria-pressed={mode === value}
            onClick={() => setMode(value)}
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border transition-colors ${
              mode === value
                ? "border-white/25 bg-white/[0.12] text-white"
                : "border-white/[0.06] bg-white/[0.03] text-zinc-400 hover:border-white/20 hover:bg-white/[0.08] hover:text-white"
            }`}
          >
            <Icon className="h-[18px] w-[18px]" />
          </button>
        ))}
      </div>
    </div>
  );
}
