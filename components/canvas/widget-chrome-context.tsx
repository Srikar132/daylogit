"use client";

import { createContext, useContext } from "react";

type WidgetChromeValue = {
  /** True once the widget has been double-clicked/tapped into interactive mode. */
  entered: boolean;
  /** A widget calls this (in an effect) to ask WidgetNode to render a full
   *  toolbar above the card, outside its own clipping, so a rounded/
   *  overflow-hidden card doesn't cut off a formatting bar. Pass null to
   *  remove it. */
  setFloatingToolbar: (toolbar: React.ReactNode | null) => void;
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
