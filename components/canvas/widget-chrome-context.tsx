"use client";

import { createContext, useContext } from "react";

type WidgetChromeValue = {
  /** True while this widget is in the `editing` phase — double-clicked into
   *  text editing (see lib/canvas/widget-interaction.ts). */
  editing: boolean;
  /** Viewport coords of the double-click/tap that entered editing, or null.
   *  That gesture arrives while the editor is still read-only, so it leaves no
   *  caret of its own — a text widget replays this point to put the caret
   *  where the user aimed rather than at the start of the document. */
  enterPoint: { x: number; y: number } | null;
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
