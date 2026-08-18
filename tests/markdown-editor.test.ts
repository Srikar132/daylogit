// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { Editor, type JSONContent } from "@tiptap/core";
import { StarterKit } from "@tiptap/starter-kit";
import { Markdown } from "@tiptap/markdown";
import { Table } from "@tiptap/extension-table";
import { TableRow } from "@tiptap/extension-table-row";
import { TableHeader } from "@tiptap/extension-table-header";
import { TableCell } from "@tiptap/extension-table-cell";
import { TaskList } from "@tiptap/extension-task-list";
import { TaskItem } from "@tiptap/extension-task-item";
import { MarkdownPasteHandler } from "@/lib/tiptap/markdown-paste";
import { normalizeMarkdownSource } from "@/lib/tiptap/markdown-signal";

// The exact shape the user reported: a table copied out of a rendered view,
// every row separated by a blank line.
const PASTED_TABLE = [
  "| | Customer | Internal staff |",
  "",
  "|---|---|---|",
  "",
  "| Identity source | Better Auth core + org plugin | Better Auth core only |",
  "",
  '| "Org" concept | Real Better Auth Organization (tenant) | None |',
  "",
  "| Portals | Customer web app | Admin Portal |",
].join("\n");

// Same extension set as components/canvas/markdown-widget.tsx — a parse only
// produces the nodes the editor's own schema actually registers, so testing
// against a different set would prove nothing about the real widget.
function createEditor() {
  return new Editor({
    element: document.createElement("div"),
    extensions: [
      StarterKit,
      Table.configure({ resizable: true }),
      TableRow,
      TableHeader,
      TableCell,
      TaskList,
      TaskItem.configure({ nested: true }),
      Markdown.configure({ markedOptions: { gfm: true, breaks: true } }),
      MarkdownPasteHandler,
    ],
    content: "",
  });
}

function nodeTypes(doc: JSONContent): string[] {
  const types: string[] = [];
  const walk = (node: JSONContent) => {
    if (node.type) types.push(node.type);
    node.content?.forEach(walk);
  };
  walk(doc);
  return types;
}

function firstOfType(doc: JSONContent, type: string): JSONContent | undefined {
  if (doc.type === type) return doc;
  for (const child of doc.content ?? []) {
    const found = firstOfType(child, type);
    if (found) return found;
  }
  return undefined;
}

/** Every text string in the node, flattened. */
function textOf(node: JSONContent): string {
  if (node.type === "text") return node.text ?? "";
  return (node.content ?? []).map(textOf).join("");
}

describe("markdown content in a real editor", () => {
  let editor: Editor;

  beforeEach(() => {
    editor = createEditor();
  });

  afterEach(() => {
    editor.destroy();
  });

  it("turns a contiguous markdown table into a real table node", () => {
    editor.commands.setContent("| a | b |\n|---|---|\n| 1 | 2 |", { contentType: "markdown" });
    expect(nodeTypes(editor.getJSON())).toContain("table");
  });

  it("turns the user's blank-line-separated table into a real table node", () => {
    editor.commands.setContent(normalizeMarkdownSource(PASTED_TABLE), { contentType: "markdown" });

    const json = editor.getJSON();
    const types = nodeTypes(json);
    expect(types).toContain("table");
    expect(types).toContain("tableHeader");
    expect(types).toContain("tableCell");

    const table = firstOfType(json, "table");
    // Header row + 3 body rows.
    expect(table?.content).toHaveLength(4);
    expect(table?.content?.[0].content).toHaveLength(3);
    expect(textOf(table!)).toContain("Internal staff");
    expect(textOf(table!)).toContain("Identity source");
  });

  it("leaves NO literal pipe characters behind once the table is parsed", () => {
    editor.commands.setContent(normalizeMarkdownSource(PASTED_TABLE), { contentType: "markdown" });
    const paragraphsOutsideTable = (editor.getJSON().content ?? []).filter((n) => n.type !== "table");
    expect(paragraphsOutsideTable.map(textOf).join("")).not.toContain("|");
  });

  it("parses the other element types that were coming through as raw text", () => {
    const source = [
      "# Heading",
      "",
      "Some **bold** and *italic* and `code` and ~~gone~~.",
      "",
      "- bullet one",
      "- bullet two",
      "",
      "1. first",
      "2. second",
      "",
      "> quoted",
      "",
      "```ts",
      "const a = 1;",
      "```",
      "",
      "[link](https://example.com)",
      "",
      "---",
    ].join("\n");

    editor.commands.setContent(source, { contentType: "markdown" });
    const json = editor.getJSON();
    const types = nodeTypes(json);

    expect(types).toContain("heading");
    expect(types).toContain("bulletList");
    expect(types).toContain("orderedList");
    expect(types).toContain("blockquote");
    expect(types).toContain("codeBlock");
    expect(types).toContain("horizontalRule");

    const marks = new Set<string>();
    const collect = (node: JSONContent) => {
      node.marks?.forEach((m) => marks.add(m.type));
      node.content?.forEach(collect);
    };
    collect(json);
    expect(marks).toContain("bold");
    expect(marks).toContain("italic");
    expect(marks).toContain("code");
    expect(marks).toContain("strike");
    expect(marks).toContain("link");
  });

  it("parses a task list", () => {
    editor.commands.setContent("- [ ] todo\n- [x] done", { contentType: "markdown" });
    const types = nodeTypes(editor.getJSON());
    expect(types).toContain("taskList");
    expect(types).toContain("taskItem");
  });

  it("round-trips back out to markdown", () => {
    editor.commands.setContent(normalizeMarkdownSource(PASTED_TABLE), { contentType: "markdown" });
    // The serializer pads cells to align columns, so match on content plus
    // the delimiter row rather than on exact spacing.
    const markdown = editor.getMarkdown();
    expect(markdown).toContain("Internal staff");
    expect(markdown).toContain("Identity source");
    expect(markdown).toMatch(/^\|[\s-]+\|[\s-]+\|[\s-]+\|$/m);
  });
});
