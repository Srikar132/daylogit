"use client";

import { createContext, useContext } from "react";

export type CanvasWidgetSummary = {
  id: string;
  type: string;
  data?: Record<string, unknown>;
};

type CanvasActions = {
  widgets: CanvasWidgetSummary[];
  addWidget: (type: string, position: { x: number; y: number }, initialData?: Record<string, unknown>) => void;
  updateWidgetData: (id: string, data: Record<string, unknown>) => void;
  deleteWidget: (id: string) => void;
  pushDrawHistory?: (strokes: any[]) => void;
  getPendingFile: (id: string) => File | undefined;
  clearPendingFile: (id: string) => void;
  resizeWidget: (id: string, size: { width: number; height: number }) => void;
  setWidgetDraggable: (id: string, draggable: boolean) => void;
  setWidgetSelected: (id: string, selected: boolean) => void;
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
