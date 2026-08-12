"use client";

import { createContext, useContext } from "react";

type CanvasActions = {
  updateWidgetData: (id: string, data: Record<string, unknown>) => void;
  deleteWidget: (id: string) => void;
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
