import { describe, expect, it } from "vitest";
import {
  CANVAS_CLASS_BY_MODE,
  FLOW_PROPS_BY_MODE,
  resolveWidgetChrome,
  widgetChromeClassName,
  widgetPhase,
  type CanvasMode,
  type WidgetPhase,
} from "@/lib/canvas/widget-interaction";

const MODES: CanvasMode[] = ["grab", "select"];
const PHASES: WidgetPhase[] = ["idle", "selected", "editing"];

describe("widgetPhase", () => {
  it("reports editing over selected", () => {
    expect(widgetPhase({ selected: true, editing: true })).toBe("editing");
    expect(widgetPhase({ selected: false, editing: true })).toBe("editing");
  });

  it("reports selected and idle", () => {
    expect(widgetPhase({ selected: true, editing: false })).toBe("selected");
    expect(widgetPhase({ selected: false, editing: false })).toBe("idle");
  });
});

describe("grab mode", () => {
  it.each(PHASES)("leaves widgets inert in phase %s so the drag reaches the pane", (phase) => {
    const chrome = resolveWidgetChrome("grab", phase, { resizable: true });
    expect(chrome.interactive).toBe(false);
    expect(chrome.draggable).toBe(false);
    expect(chrome.showResizeControls).toBe(false);
    expect(chrome.cursor).toBe("grab");
  });

  it("pans on drag and does not marquee-select", () => {
    expect(FLOW_PROPS_BY_MODE.grab).toMatchObject({
      panOnDrag: true,
      selectionOnDrag: false,
      nodesDraggable: false,
      elementsSelectable: false,
    });
  });

  it("shows a grab cursor on the pane", () => {
    expect(CANVAS_CLASS_BY_MODE.grab).toContain("cursor-grab");
    expect(CANVAS_CLASS_BY_MODE.select).toBe("");
  });
});

describe("select mode", () => {
  it.each(PHASES)("keeps the widget body live in phase %s", (phase) => {
    expect(resolveWidgetChrome("select", phase, { resizable: true }).interactive).toBe(true);
  });

  it("marquee-selects on left-drag, keeps middle-drag and Space for panning", () => {
    expect(FLOW_PROPS_BY_MODE.select).toMatchObject({
      panOnDrag: [1],
      selectionOnDrag: true,
      nodesDraggable: true,
      elementsSelectable: true,
      panActivationKeyCode: "Space",
    });
  });

  it("shows resize controls only while selected", () => {
    const shown = PHASES.filter((phase) => resolveWidgetChrome("select", phase, { resizable: true }).showResizeControls);
    expect(shown).toEqual(["selected"]);
  });

  it("never shows resize controls for a non-resizable widget type", () => {
    for (const phase of PHASES) {
      expect(resolveWidgetChrome("select", phase, { resizable: false }).showResizeControls).toBe(false);
    }
  });

  it("hands drags to the widget only while editing, so text selection wins over repositioning", () => {
    const editing = resolveWidgetChrome("select", "editing", { resizable: true });
    expect(editing.claimsDrag).toBe(true);
    expect(editing.draggable).toBe(false);
    expect(editing.textSelectable).toBe(true);
    expect(editing.cursor).toBe("text");

    for (const phase of ["idle", "selected"] as const) {
      const chrome = resolveWidgetChrome("select", phase, { resizable: true });
      expect(chrome.claimsDrag).toBe(false);
      expect(chrome.draggable).toBe(true);
      expect(chrome.textSelectable).toBe(false);
    }
  });
});

describe("widgetChromeClassName", () => {
  it("marks an inert body as pointer-events-none", () => {
    const className = widgetChromeClassName(resolveWidgetChrome("grab", "idle", { resizable: true }), "idle");
    expect(className).toContain("pointer-events-none");
    expect(className).toContain("select-none");
  });

  it("opts text back in while editing (xyflow sets user-select:none on every node)", () => {
    const className = widgetChromeClassName(resolveWidgetChrome("select", "editing", { resizable: true }), "editing");
    expect(className).toContain("select-text");
    expect(className).toContain("nodrag");
    expect(className).toContain("nowheel");
    expect(className).toContain("cursor-text");
    expect(className).not.toContain("pointer-events-none");
  });

  it("rings the card in selected and editing but not idle", () => {
    const ringOf = (mode: CanvasMode, phase: WidgetPhase) =>
      widgetChromeClassName(resolveWidgetChrome(mode, phase, { resizable: true }), phase).includes("ring-2");
    expect(ringOf("select", "idle")).toBe(false);
    expect(ringOf("select", "selected")).toBe(true);
    expect(ringOf("select", "editing")).toBe(true);
  });

  it("emits no empty or duplicated class tokens", () => {
    for (const mode of MODES) {
      for (const phase of PHASES) {
        const tokens = widgetChromeClassName(resolveWidgetChrome(mode, phase, { resizable: true }), phase).split(" ");
        expect(tokens).not.toContain("");
        expect(new Set(tokens).size).toBe(tokens.length);
      }
    }
  });
});
