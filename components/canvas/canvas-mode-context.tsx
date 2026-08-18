"use client";

import { createContext, useContext } from "react";
import type { CanvasMode } from "@/lib/canvas/widget-interaction";

type CanvasModeValue = {
  mode: CanvasMode;
  setMode: (mode: CanvasMode) => void;
};

const CanvasModeContext = createContext<CanvasModeValue | null>(null);

export const CanvasModeProvider = CanvasModeContext.Provider;

export function useCanvasMode(): CanvasModeValue {
  const ctx = useContext(CanvasModeContext);
  if (!ctx) {
    throw new Error("useCanvasMode must be used within CanvasShell.");
  }
  return ctx;
}
