"use client";

import { createContext, useContext } from "react";
import type { LucideIcon } from "lucide-react";

export type FloatingAction = {
  icon: LucideIcon;
  label: string;
  onClick: () => void;
};

type WidgetChromeValue = {
  /** True once the widget has been double-clicked/tapped into interactive mode. */
  entered: boolean;
  /** A widget calls this (in an effect) to ask WidgetNode to render an external
   *  action button just outside its own card — pass null to remove it. */
  setFloatingAction: (action: FloatingAction | null) => void;
};

const WidgetChromeContext = createContext<WidgetChromeValue | null>(null);

export const WidgetChromeProvider = WidgetChromeContext.Provider;

export function useWidgetChrome(): WidgetChromeValue {
  const ctx = useContext(WidgetChromeContext);
  if (!ctx) {
    throw new Error("useWidgetChrome must be used within a widget rendered by WidgetNode.");
  }
  return ctx;
}
