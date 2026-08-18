import { describe, expect, it } from "vitest";
import { looksLikeMarkdown, normalizeMarkdownSource, shouldParseAsMarkdown } from "@/lib/tiptap/markdown-signal";

// Pure string-level assertions only — that a normalized table actually becomes
// a table node is proven against a real editor in markdown-editor.test.ts.

// A table copied out of a rendered chat/doc view: every row separated by a
// blank line, which terminates the table as far as GFM is concerned.
const BLANK_SEPARATED_TABLE = [
  "| | Customer | Internal staff |",
  "",
  "|---|---|---|",
  "",
  '| Identity source | Better Auth core + org plugin | Better Auth core only |',
  "",
  '| "Org" concept | Real Better Auth Organization (tenant) | None |',
].join("\n");

const TABLE = ["| Name | Role |", "| --- | --- |", "| Ada | Eng |"].join("\n");

describe("looksLikeMarkdown", () => {
  it.each([
    ["heading", "# Title"],
    ["deep heading", "###### Title"],
    ["table", TABLE],
    ["table delimiter alone", "| :--- | ---: |"],
    ["fenced code", "```ts\nconst a = 1;\n```"],
    ["tilde fence", "~~~\nraw\n~~~"],
    ["blockquote", "> quoted"],
    ["bullet list", "- first\n- second"],
    ["star bullet", "* first"],
    ["ordered list", "1. first\n2. second"],
    ["paren ordered list", "1) first"],
    ["task list", "- [ ] todo\n- [x] done"],
    ["thematic break", "---"],
    ["bold", "some **bold** text"],
    ["underscore bold", "some __bold__ text"],
    ["strikethrough", "some ~~gone~~ text"],
    ["inline code", "call `render()` first"],
    ["link", "see [docs](https://example.com)"],
    ["image", "![alt](https://example.com/a.png)"],
  ])("detects %s", (_label, text) => {
    expect(looksLikeMarkdown(text)).toBe(true);
  });

  it.each([
    ["plain prose", "Just a sentence about nothing."],
    ["multi-line prose", "First line\nSecond line"],
    ["bare url", "https://example.com/page"],
    ["empty", ""],
    ["whitespace", "   \n  "],
    ["arithmetic", "let total = a * b + c"],
  ])("does not flag %s", (_label, text) => {
    expect(looksLikeMarkdown(text)).toBe(false);
  });
});

describe("shouldParseAsMarkdown", () => {
  it("parses markdown when the clipboard has no html flavor", () => {
    expect(shouldParseAsMarkdown(TABLE, undefined)).toBe(true);
  });

  it("parses markdown when the html flavor is only a plain-text re-wrap", () => {
    const html = `<meta charset='utf-8'><div><span>${TABLE}</span></div>`;
    expect(shouldParseAsMarkdown(TABLE, html)).toBe(true);
  });

  it("parses markdown when the html flavor is just a code-block wrapper", () => {
    expect(shouldParseAsMarkdown(TABLE, `<pre><code class="language-md">${TABLE}</code></pre>`)).toBe(true);
  });

  it("defers to ProseMirror when the html flavor carries real formatting", () => {
    const html = "<table><tbody><tr><td>Ada</td></tr></tbody></table>";
    expect(shouldParseAsMarkdown(TABLE, html)).toBe(false);
  });

  it("defers to ProseMirror for a rich list even though the text looks like markdown", () => {
    expect(shouldParseAsMarkdown("- first\n- second", "<ul><li>first</li><li>second</li></ul>")).toBe(false);
  });

  it("ignores plain text with no markdown syntax", () => {
    expect(shouldParseAsMarkdown("Just a sentence.", undefined)).toBe(false);
  });

  it("ignores an empty payload", () => {
    expect(shouldParseAsMarkdown("", "<p></p>")).toBe(false);
  });

  it("still flags a table whose rows are separated by blank lines", () => {
    expect(shouldParseAsMarkdown(BLANK_SEPARATED_TABLE, undefined)).toBe(true);
  });
});

describe("normalizeMarkdownSource", () => {
  it("makes the rows of a blank-line-separated table contiguous", () => {
    expect(normalizeMarkdownSource(BLANK_SEPARATED_TABLE).split("\n")).toEqual([
      "| | Customer | Internal staff |",
      "|---|---|---|",
      "| Identity source | Better Auth core + org plugin | Better Auth core only |",
      '| "Org" concept | Real Better Auth Organization (tenant) | None |',
    ]);
  });

  it("leaves an already-contiguous table untouched", () => {
    expect(normalizeMarkdownSource(TABLE)).toBe(TABLE);
  });

  it("keeps blank lines that separate paragraphs", () => {
    const text = "First paragraph.\n\nSecond paragraph.";
    expect(normalizeMarkdownSource(text)).toBe(text);
  });

  it("keeps the blank line between a table and following prose", () => {
    const text = `${TABLE}\n\nSome prose after the table.`;
    expect(normalizeMarkdownSource(text)).toBe(text);
  });

  it("keeps the blank line between prose and a following table", () => {
    const text = `Intro line.\n\n${TABLE}`;
    expect(normalizeMarkdownSource(text)).toBe(text);
  });

  it("collapses multi-line blank runs between table rows", () => {
    const text = "| a | b |\n\n\n\n|---|---|\n\n| 1 | 2 |";
    expect(normalizeMarkdownSource(text)).toBe("| a | b |\n|---|---|\n| 1 | 2 |");
  });

  it("does not treat prose containing a pipe as table structure", () => {
    const text = "run a | b in the shell\n\nthen check output";
    expect(normalizeMarkdownSource(text)).toBe(text);
  });

  it("is a no-op on text with no pipes at all", () => {
    const text = "# Heading\n\nBody text.";
    expect(normalizeMarkdownSource(text)).toBe(text);
  });

  it("normalizes CRLF table rows too", () => {
    expect(normalizeMarkdownSource("| a | b |\r\n\r\n|---|---|\r\n\r\n| 1 | 2 |")).toBe("| a | b |\n|---|---|\n| 1 | 2 |");
  });
});
