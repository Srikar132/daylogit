// Real formatting in the clipboard's html flavor means the paste is genuinely
// rich (a selection from Docs/Notion/a rendered page), and ProseMirror's own
// html path reproduces it better than re-parsing the plain-text flavor as
// markdown. `pre`/`code` are deliberately absent from this list: copying a
// fenced code block whose contents are markdown source is the most common way
// markdown source reaches this editor, and that payload's only "rich" tag is
// the wrapper itself.
const RICH_HTML_TAGS =
  /<(strong|b|em|i|u|s|del|ins|mark|h[1-6]|ul|ol|li|table|thead|tbody|tr|td|th|blockquote|a|img|figure|hr)\b/i;
const CODE_WRAPPER_TAGS = /<\/?(pre|code)\b[^>]*>/gi;

// Block and inline markdown syntax. Thematic breaks are spelled out per
// character instead of using a backreference — these alternatives are joined
// into one pattern, so group numbers aren't stable.
const MARKDOWN_SIGNAL = new RegExp(
  [
    "^ {0,3}#{1,6}\\s", // heading
    "^ {0,3}(?:```|~~~)", // fenced code
    "^ {0,3}\\|.*\\|[ \\t]*$", // table row
    "^ {0,3}\\|?[ \\t]*:?-{3,}:?[ \\t|:-]*$", // table delimiter
    "^ {0,3}>[ \\t]", // blockquote
    "^ {0,3}[-*+][ \\t]+\\[[ xX]\\][ \\t]", // task item
    "^ {0,3}[-*+][ \\t]+\\S", // bullet list
    "^ {0,3}\\d+[.)][ \\t]+\\S", // ordered list
    "^ {0,3}(?:-{3,}|\\*{3,}|_{3,})[ \\t]*$", // thematic break
    "\\*\\*[^*\\n]+\\*\\*", // bold
    "__[^_\\n]+__", // bold (underscore)
    "~~[^~\\n]+~~", // strikethrough
    "`[^`\\n]+`", // inline code
    "!?\\[[^\\]\\n]*\\]\\([^)\\n]+\\)", // link / image
  ].join("|"),
  "m",
);

/**
 * Whether a paste's plain-text flavor should be parsed as markdown source
 * rather than handed to ProseMirror's html-aware path.
 *
 * tiptap-markdown's own clipboardTextParser only ever runs when the paste has
 * NO html flavor — but copying markdown source from a browser tab, a chat
 * window, or most editors puts an html flavor on the clipboard too (often just
 * the same text re-wrapped in a `<p>`/`<span>`), so ProseMirror always prefers
 * that html and the markdown parser never gets a turn.
 */
export function shouldParseAsMarkdown(text: string | undefined | null, html?: string | null): boolean {
  if (!text || !text.trim()) return false;
  if (html && RICH_HTML_TAGS.test(html.replace(CODE_WRAPPER_TAGS, ""))) return false;
  return MARKDOWN_SIGNAL.test(text);
}

/** Does this text contain markdown syntax at all, ignoring any clipboard html? */
export function looksLikeMarkdown(text: string | undefined | null): boolean {
  return Boolean(text && MARKDOWN_SIGNAL.test(text));
}

// A pipe-delimited table row (header, delimiter, or body). Conservative on
// purpose — must open with a pipe and carry a second one, so ordinary prose
// that happens to contain a `|` isn't mistaken for table structure.
function isTableRow(line: string | undefined): boolean {
  if (!line) return false;
  const trimmed = line.trim();
  return trimmed.startsWith("|") && trimmed.indexOf("|", 1) > 0;
}

/**
 * Repairs markdown source before it reaches markdown-it.
 *
 * A blank line terminates a table as far as markdown-it (correctly, per GFM)
 * is concerned — but copying a rendered table out of a chat window or doc very
 * often yields exactly that: every row separated by a blank line. The result
 * parses as a stack of paragraphs full of pipe characters instead of a table,
 * which is indistinguishable to the user from "tables don't work". Blank runs
 * BETWEEN two table rows are dropped; every other blank line is left alone,
 * since elsewhere they carry real meaning (paragraph breaks, list looseness).
 */
export function normalizeMarkdownSource(text: string): string {
  if (!text.includes("|")) return text;

  const lines = text.split(/\r\n|\r|\n/);
  const out: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    if (lines[i].trim() === "") {
      let next = i;
      while (next < lines.length && lines[next].trim() === "") next++;
      if (isTableRow(out[out.length - 1]) && isTableRow(lines[next])) {
        i = next - 1;
        continue;
      }
    }
    out.push(lines[i]);
  }

  return out.join("\n");
}
