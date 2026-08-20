"use client";

import { createContext, useContext } from "react";
import type { CanvasMode } from "@/lib/canvas/widget-interaction";
import type { DrawTool } from "@/lib/canvas/stroke-utils";

export interface CanvasModeValue {
  mode: CanvasMode;
  setMode: (mode: CanvasMode) => void;
  activeTool: DrawTool | "laser";
  setActiveTool: (tool: DrawTool | "laser") => void;
  strokeColor: string;
  setStrokeColor: (color: string) => void;
  strokeWidth: number;
  setStrokeWidth: (width: number) => void;
  canUndo: boolean;
  canRedo: boolean;
  undoDraw: () => void;
  redoDraw: () => void;
}

const CanvasModeContext = createContext<CanvasModeValue | null>(null);

export const CanvasModeProvider = CanvasModeContext.Provider;

export function useCanvasMode(): CanvasModeValue {
  const ctx = useContext(CanvasModeContext);
  if (!ctx) {
    throw new Error("useCanvasMode must be used within CanvasShell.");
  }
  return ctx;
}
