/**
 * The canvas interaction model, as data.
 *
 * Two independent axes decide how a widget behaves, and every behaviour is
 * derived from the pair rather than branched on at each use site:
 *
 * - **mode** — the canvas-wide tool. `grab` navigates (drag pans, wheel zooms)
 *   and widgets are inert; `select` interacts (widgets are live, drag on empty
 *   pane marquee-selects).
 * - **phase** — where this one widget is within `select`: `idle`, `selected`
 *   (resize controls up, drag repositions), or `editing` (text editing, so the
 *   widget claims drags for text selection instead of repositioning).
 *
 * `editing` exists only for widgets that own a text caret. It is not a
 * general-purpose "interactive" gate — in `select` mode every widget's body is
 * live from the first click, so buttons, media controls and inputs need no
 * per-type exception. What genuinely conflicts is *drag*: inside text a drag
 * must select characters, on an object it must move the object, and no
 * heuristic can tell those apart. Figma, Miro and tldraw all resolve it the
 * same way — double-click to enter text, click outside to leave.
 */

export type CanvasMode = "grab" | "select";
export type WidgetPhase = "idle" | "selected" | "editing";

export type WidgetChrome = {
  /** xyflow is allowed to reposition this node. */
  draggable: boolean;
  /** The widget body receives pointer events at all. */
  interactive: boolean;
  /** Body claims drags (`nodrag`) so xyflow never moves the card out from
   *  under a text selection. */
  claimsDrag: boolean;
  /** Body claims the wheel (`nowheel`) so its own scroll container wins over
   *  canvas zoom. */
  claimsWheel: boolean;
  /** Text inside the body can be selected by dragging. Must be explicit:
   *  xyflow sets `user-select: none` on every node wrapper. */
  textSelectable: boolean;
  /** Resize controls are mounted. They sit ON TOP of the card, so they must
   *  not be up while the user is aiming a caret at the content underneath. */
  showResizeControls: boolean;
  cursor: "grab" | "default" | "text";
};

const GRAB_CHROME: WidgetChrome = {
  draggable: false,
  interactive: false,
  claimsDrag: false,
  claimsWheel: false,
  textSelectable: false,
  showResizeControls: false,
  cursor: "grab",
};

/**
 * The whole model. Six cells, no conditionals — read a row instead of
 * reconstructing the rules at each call site.
 */
const CHROME: Record<CanvasMode, Record<WidgetPhase, WidgetChrome>> = {
  // Pure navigation: every widget is transparent to the pointer, so a drag
  // anywhere reaches the pane and pans. One rule for every widget type.
  grab: {
    idle: GRAB_CHROME,
    selected: GRAB_CHROME,
    editing: GRAB_CHROME,
  },
  select: {
    idle: {
      draggable: true,
      interactive: true,
      claimsDrag: false,
      claimsWheel: true,
      textSelectable: false,
      showResizeControls: false,
      cursor: "default",
    },
    selected: {
      draggable: true,
      interactive: true,
      claimsDrag: false,
      claimsWheel: true,
      textSelectable: false,
      showResizeControls: true,
      cursor: "default",
    },
    editing: {
      draggable: false,
      interactive: true,
      claimsDrag: true,
      claimsWheel: true,
      textSelectable: true,
      showResizeControls: false,
      cursor: "text",
    },
  },
};

export function widgetPhase({ selected, editing }: { selected: boolean; editing: boolean }): WidgetPhase {
  if (editing) return "editing";
  return selected ? "selected" : "idle";
}

/** `resizable: false` widget types (see the registry) can never show resize
 *  controls regardless of phase — everything else comes from the table. */
export function resolveWidgetChrome(
  mode: CanvasMode,
  phase: WidgetPhase,
  { resizable }: { resizable: boolean },
): WidgetChrome {
  const chrome = CHROME[mode][phase];
  if (chrome.showResizeControls && !resizable) return { ...chrome, showResizeControls: false };
  return chrome;
}

const FLAG_CLASSES: Array<{ flag: keyof WidgetChrome; whenTrue?: string; whenFalse?: string }> = [
  { flag: "interactive", whenFalse: "pointer-events-none" },
  { flag: "claimsDrag", whenTrue: "nodrag" },
  { flag: "claimsWheel", whenTrue: "nowheel" },
  { flag: "textSelectable", whenTrue: "select-text", whenFalse: "select-none" },
];

const CURSOR_CLASSES: Record<WidgetChrome["cursor"], string> = {
  grab: "cursor-grab active:cursor-grabbing",
  default: "cursor-default",
  text: "cursor-text",
};

const PHASE_RING_CLASSES: Record<WidgetPhase, string> = {
  idle: "",
  selected: "ring-2 ring-white/20 shadow-[0_0_15px_rgba(255,255,255,0.1)]",
  editing: "ring-2 ring-white/40 shadow-[0_0_20px_rgba(255,255,255,0.15)]",
};

/** Every class the card shell needs for a given chrome/phase, assembled from
 *  the tables above so no component has to spell the mapping out inline. */
export function widgetChromeClassName(chrome: WidgetChrome, phase: WidgetPhase): string {
  const flags = FLAG_CLASSES.map(({ flag, whenTrue, whenFalse }) => (chrome[flag] ? whenTrue : whenFalse));
  return [...flags, CURSOR_CLASSES[chrome.cursor], PHASE_RING_CLASSES[phase]].filter(Boolean).join(" ");
}

/**
 * The xyflow props that differ by mode. `panActivationKeyCode` is xyflow's own
 * hold-to-pan escape hatch, so Space-drag pans while in `select` without any
 * key handling of ours.
 */
/** Pane cursor per mode — grab reads as grabbable everywhere, select leaves the
 *  cursor to whatever each widget's own chrome asks for. */
export const CANVAS_CLASS_BY_MODE: Record<CanvasMode, string> = {
  grab: "cursor-grab active:cursor-grabbing",
  select: "",
};

export const FLOW_PROPS_BY_MODE: Record<
  CanvasMode,
  {
    /** `true` = any button pans; an array = only those mouse buttons do. */
    panOnDrag: boolean | number[];
    selectionOnDrag: boolean;
    nodesDraggable: boolean;
    elementsSelectable: boolean;
    panActivationKeyCode: string | null;
  }
> = {
  grab: {
    panOnDrag: true,
    selectionOnDrag: false,
    nodesDraggable: false,
    elementsSelectable: false,
    panActivationKeyCode: null,
  },
  select: {
    // Middle-drag still pans without leaving select — left-drag is the marquee,
    // and reaching for the mode switch to nudge the viewport gets old fast.
    panOnDrag: [1],
    selectionOnDrag: true,
    nodesDraggable: true,
    elementsSelectable: true,
    panActivationKeyCode: "Space",
  },
};
