// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { Editor } from "@tiptap/core";
import { createNoteExtensions } from "@/lib/tiptap/note-extensions";
import { containsPattern, escapeLikePattern, toPlainJson } from "@/lib/utils";

/**
 * The colour bug: ProseMirror builds a mark's `attrs` with `Object.create(null)`,
 * and React Flight — which serializes server-action arguments — only handles
 * objects whose prototype is `Object.prototype`. It passed those as opaque
 * "temporary client references" instead, so the colour was gone by the time the
 * action wrote the row. Marks without attrs (bold) were unaffected, which is why
 * only colour looked broken.
 */
describe("ProseMirror JSON crossing a server-action boundary", () => {
  function coloredDoc() {
    const editor = new Editor({
      element: document.createElement("div"),
      extensions: createNoteExtensions(),
      content: "<p>hello</p>",
    });
    editor.commands.selectAll();
    editor.commands.setColor("#fdd663");
    editor.commands.toggleBold();
    const json = editor.getJSON();
    editor.destroy();
    return json;
  }

  function marksOf(doc: Record<string, unknown>) {
    const found: { type: string; attrs?: Record<string, unknown> }[] = [];
    const walk = (node: Record<string, unknown>) => {
      (node.marks as typeof found | undefined)?.forEach((m) => found.push(m));
      (node.content as Record<string, unknown>[] | undefined)?.forEach(walk);
    };
    walk(doc);
    return found;
  }

  it("produces attrs with a null prototype — the reason Flight rejected them", () => {
    const textStyle = marksOf(coloredDoc()).find((m) => m.type === "textStyle");
    expect(textStyle?.attrs).toBeDefined();
    expect(Object.getPrototypeOf(textStyle!.attrs!)).toBeNull();
  });

  it("toPlainJson gives every nested object a normal prototype", () => {
    const textStyle = marksOf(toPlainJson(coloredDoc())).find((m) => m.type === "textStyle");
    expect(Object.getPrototypeOf(textStyle!.attrs!)).toBe(Object.prototype);
  });

  it("keeps the colour through the round trip", () => {
    const textStyle = marksOf(toPlainJson(coloredDoc())).find((m) => m.type === "textStyle");
    expect(textStyle?.attrs?.color).toBe("#fdd663");
  });

  it("keeps attribute-less marks too, which is why bold always survived", () => {
    expect(marksOf(toPlainJson(coloredDoc())).some((m) => m.type === "bold")).toBe(true);
  });

  it("survives being reloaded into a fresh editor, the way a saved note is", () => {
    const reloaded = new Editor({
      element: document.createElement("div"),
      extensions: createNoteExtensions(),
      content: toPlainJson(coloredDoc()),
    });
    const colors: string[] = [];
    reloaded.state.doc.descendants((node) => {
      node.marks.forEach((m) => {
        if (m.type.name === "textStyle" && m.attrs.color) colors.push(m.attrs.color as string);
      });
    });
    reloaded.destroy();
    expect(colors).toEqual(["#fdd663"]);
  });
});

describe("toPlainJson", () => {
  it("converts a null-prototype object nested anywhere", () => {
    const attrs = Object.assign(Object.create(null), { color: "#fff" });
    const plain = toPlainJson({ marks: [{ type: "textStyle", attrs }] });
    expect(Object.getPrototypeOf(plain.marks[0].attrs)).toBe(Object.prototype);
    expect(plain.marks[0].attrs.color).toBe("#fff");
  });

  it("drops undefined values, matching what JSON storage does anyway", () => {
    expect(toPlainJson({ a: 1, b: undefined })).toEqual({ a: 1 });
  });

  it("preserves nulls, which carry meaning in mark attrs", () => {
    expect(toPlainJson({ fontSize: null })).toEqual({ fontSize: null });
  });
});

describe("escapeLikePattern", () => {
  it("neutralises SQL wildcards a user typed", () => {
    // Without this, a lone "%" in the invite box matches every user in the
    // database instead of none.
    expect(escapeLikePattern("100%")).toBe("100\\%");
    expect(escapeLikePattern("a_b")).toBe("a\\_b");
  });

  it("escapes backslashes first, so the added escapes survive", () => {
    // One backslash in, two out — otherwise the escapes added above would
    // themselves be escaped by this pass.
    expect(escapeLikePattern("a\\b")).toBe("a\\\\b");
  });

  it("leaves ordinary text alone", () => {
    expect(escapeLikePattern("alice@example.com")).toBe("alice@example.com");
  });

  it("wraps a contains pattern and trims the input", () => {
    expect(containsPattern("  ali  ")).toBe("%ali%");
  });
});
