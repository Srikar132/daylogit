// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { Editor } from "@tiptap/core";
import { createNoteExtensions } from "@/lib/tiptap/note-extensions";

/**
 * Both editors persist from Tiptap's `update` event, so anything that emits one
 * without the user having typed becomes a write — a wasted one for someone who
 * can edit, and a rejected "View-only access." request for someone who can't.
 * `setEditable` emits by default, which is exactly how opening a doc started
 * saving every page in it.
 */
function createEditor({ editable }: { editable: boolean }) {
  const editor = new Editor({
    element: document.createElement("div"),
    extensions: createNoteExtensions(),
    content: "<p>existing content</p>",
    editable,
  });
  let updates = 0;
  editor.on("update", () => {
    updates += 1;
  });
  return { editor, updates: () => updates };
}

describe("what counts as a save trigger", () => {
  let open: Editor | null = null;

  afterEach(() => {
    open?.destroy();
    open = null;
  });

  it("setEditable emits an update by default — the trap", () => {
    const { editor, updates } = createEditor({ editable: false });
    open = editor;
    editor.setEditable(true);
    expect(updates()).toBeGreaterThan(0);
  });

  it("setEditable(value, false) stays silent, which is how both editors must call it", () => {
    const { editor, updates } = createEditor({ editable: false });
    open = editor;
    editor.setEditable(true, false);
    editor.setEditable(false, false);
    expect(updates()).toBe(0);
  });

  it("loading content into a read-only editor emits nothing", () => {
    const { editor, updates } = createEditor({ editable: false });
    open = editor;
    expect(editor.isEditable).toBe(false);
    expect(updates()).toBe(0);
  });

  it("still emits for a real edit, so saving isn't broken by the guard", () => {
    const { editor, updates } = createEditor({ editable: true });
    open = editor;
    editor.commands.insertContent(" more");
    expect(updates()).toBeGreaterThan(0);
  });
});
