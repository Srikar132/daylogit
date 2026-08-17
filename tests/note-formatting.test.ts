// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { Editor } from "@tiptap/core";
import { createNoteExtensions } from "@/lib/tiptap/note-extensions";

// Mirrors the marks half of markdown-widget.tsx / tiptap-editor.tsx. The
// note toolbar drives all of these, so a command that silently no-ops (an
// extension that isn't registered) is indistinguishable from a broken button.
function createEditor(content: string | Record<string, unknown> = "<p>hello world</p>") {
  return new Editor({ element: document.createElement("div"), extensions: createNoteExtensions(), content });
}

/** jsdom serializes an inline colour as `rgb(r, g, b)`, so assert on the
 *  parsed mark attributes instead of the HTML string. */
function colorsOf(editor: Editor): string[] {
  const colors: string[] = [];
  editor.state.doc.descendants((node) => {
    node.marks.forEach((mark) => {
      if (mark.type.name === "textStyle" && mark.attrs.color) colors.push(mark.attrs.color as string);
    });
  });
  return colors;
}

describe("note toolbar commands", () => {
  let editor: Editor;

  beforeEach(() => {
    editor = createEditor();
    editor.commands.selectAll();
  });

  afterEach(() => {
    editor.destroy();
  });

  it("exposes every command the toolbar calls", () => {
    for (const command of [
      "toggleBold",
      "toggleItalic",
      "toggleStrike",
      "toggleUnderline",
      "toggleCode",
      "toggleHeading",
      "toggleBulletList",
      "toggleOrderedList",
      "toggleBlockquote",
      "setColor",
      "setHighlight",
      "unsetHighlight",
      "setFontSize",
    ]) {
      expect(editor.commands, command).toHaveProperty(command);
    }
  });

  it("setColor applies the colour as a textStyle mark", () => {
    expect(editor.commands.setColor("#8ab4f8")).toBe(true);
    expect(colorsOf(editor)).toEqual(["#8ab4f8"]);
  });

  it("setColor marks the colour active so the toolbar can highlight it", () => {
    editor.commands.setColor("#8ab4f8");
    expect(editor.isActive("textStyle", { color: "#8ab4f8" })).toBe(true);
  });

  it("setFontSize renders an inline size", () => {
    expect(editor.commands.setFontSize("18px")).toBe(true);
    expect(editor.getHTML()).toContain("font-size: 18px");
  });

  it("keeps colour and font size on the same text instead of one clobbering the other", () => {
    editor.commands.setColor("#8ab4f8");
    editor.commands.setFontSize("18px");
    expect(colorsOf(editor)).toEqual(["#8ab4f8"]);
    expect(editor.getHTML()).toContain("font-size: 18px");
  });

  it("keeps colour when highlight is applied over it", () => {
    editor.commands.setColor("#f28b82");
    editor.commands.setHighlight({ color: "rgba(138,180,248,0.25)" });
    expect(colorsOf(editor)).toEqual(["#f28b82"]);
    expect(editor.getHTML()).toContain("background-color: rgba(138, 180, 248, 0.25)");
  });

  it("survives a blur/refocus round trip, which is what a toolbar click does", () => {
    editor.commands.blur();
    editor.chain().focus().setColor("#81c995").run();
    expect(colorsOf(editor)).toEqual(["#81c995"]);
  });

  // The reported bug is that colour survives until reload — i.e. the save or
  // the reload, not the command. These two cover the persistence contract the
  // widget relies on: the change must fire onUpdate (that's what schedules the
  // save) and must come back out of the saved JSON.
  it("fires onUpdate so the widget's debounced save is actually scheduled", () => {
    let updates = 0;
    const watched = createEditor();
    watched.on("update", () => {
      updates += 1;
    });
    watched.commands.selectAll();
    watched.commands.setColor("#c58af9");
    expect(updates).toBeGreaterThan(0);
    watched.destroy();
  });

  // The registered extension set is what defines the schema, and ProseMirror
  // silently DROPS attributes the schema doesn't declare — setColor against a
  // textStyle mark with no `color` attribute yields a bare <span> and saves a
  // mark with no attrs at all. So this asserts against the widget's exact
  // extension list, not a representative subset.
  it("declares the colour attribute on textStyle — the schema the app actually builds", () => {
    // ProseMirror silently DROPS attributes the schema doesn't declare, so a
    // missing `color` here is what makes setColor produce a bare <span> and
    // save a mark with no attrs at all. This asserts against the shared
    // factory both editors use, not a hand-copied subset.
    expect(createEditor().schema.marks.textStyle.spec.attrs).toHaveProperty("color");
  });

  it("serialises the colour into the payload the widget sends to the server", () => {
    editor.commands.setColor("#8ab4f8");
    const saved = JSON.parse(JSON.stringify(editor.getJSON()));
    const marks = saved.content[0].content.flatMap((n: { marks?: unknown[] }) => n.marks ?? []);
    expect(marks).toContainEqual({ type: "textStyle", attrs: expect.objectContaining({ color: "#8ab4f8" }) });
  });

  it("round-trips colour, font size and highlight through saved JSON", () => {
    editor.commands.setColor("#c58af9");
    editor.commands.setFontSize("24px");
    editor.commands.setHighlight({ color: "rgba(129,201,149,0.25)" });

    // Exactly what markdown-widget persists and re-mounts with.
    const saved = JSON.parse(JSON.stringify(editor.getJSON()));
    const reloaded = createEditor(saved);

    expect(colorsOf(reloaded)).toEqual(["#c58af9"]);
    expect(reloaded.getHTML()).toContain("font-size: 24px");
    expect(reloaded.getHTML()).toContain("background-color: rgba(129, 201, 149, 0.25)");
    reloaded.destroy();
  });
});
