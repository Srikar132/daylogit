"use client";

import { createContext, useContext } from "react";

type CanvasActions = {
  updateWidgetData: (id: string, data: Record<string, unknown>) => void;
  deleteWidget: (id: string) => void;
  /** Pending uploads live in memory only (a raw File can't be persisted) —
   *  these hand a media widget its own File so it can start/retry its own
   *  upload without threading it through node data. */
  getPendingFile: (id: string) => File | undefined;
  clearPendingFile: (id: string) => void;
  /** Resizes a node directly (width/height), not its data — used once to
   *  snap a fresh media widget to the uploaded file's real aspect ratio. */
  resizeWidget: (id: string, size: { width: number; height: number }) => void;
};

const CanvasActionsContext = createContext<CanvasActions | null>(null);

export const CanvasActionsProvider = CanvasActionsContext.Provider;

export function useCanvasActions(): CanvasActions {
  const ctx = useContext(CanvasActionsContext);
  if (!ctx) {
    throw new Error("useCanvasActions must be used within CanvasShell.");
  }
  return ctx;
}
