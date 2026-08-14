/**
 * Parses a worklog `summary` string written in the daylog task/what-done
 * format:
 *
 *   task: <short sentence>
 *   what-done: <short sentence>
 *   ---
 *   task: <short sentence>
 *   what-done: <short sentence>
 *   ---
 *
 * Robust to real-world drift: CRLF/LF, a missing trailing "---", extra blank
 * lines between blocks, case-insensitive labels, "what done"/"whatdone"
 * label spelling, and multi-line field values. A block that doesn't match
 * the task/what-done shape at all (a legacy free-text entry predating this
 * format, or just a typo) still comes back as one item with only `raw` set,
 * so every summary — structured or not — renders through the same code path
 * instead of the dialog needing a separate "old format" branch.
 *
 * Single linear pass regardless of block count (split, not repeated
 * indexOf/slice) — this runs on every entry a dialog opens, so it stays
 * cheap even for a summary carrying dozens of blocks.
 */

export interface ParsedLogItem {
  /** Present only when the block matched the "task:" label. */
  task?: string;
  /** Present only when the block matched the "what-done:" label. */
  whatDone?: string;
  /** The block's original text, always set — the fallback render target for an unstructured block. */
  raw: string;
}

// A standalone line of 3+ dashes (optionally padded with spaces/tabs, either
// LF or CRLF) is the block delimiter.
const DELIMITER_RE = /^[ \t]*-{3,}[ \t]*\r?$/gm;

// "task:" then a line break then "what[- ]done:" then everything else in the
// block. Labels are case-insensitive and tolerate "what done"/"what-done"/
// "whatdone". The task capture is lazy (stops at the line break before the
// what-done label); the what-done capture is greedy (takes the rest of the
// block, including any further line breaks) since it's always last.
const FIELD_RE =
  /^[ \t]*task[ \t]*:[ \t]*([\s\S]*?)[ \t]*\r?\n[ \t]*what[ \t-]*done[ \t]*:[ \t]*([\s\S]*)$/i;

/** Splits a raw summary into "---"-delimited blocks, trimmed, empties dropped. */
function splitBlocks(summary: string): string[] {
  return summary
    .split(DELIMITER_RE)
    .map((block) => block.trim())
    .filter(Boolean);
}

/** Parses one block into a task/what-done pair, or a raw fallback if it doesn't match. */
function parseBlock(block: string): ParsedLogItem {
  const match = FIELD_RE.exec(block);
  if (!match) return { raw: block };

  const task = match[1].trim();
  const whatDone = match[2].trim();
  // A label matched but came back empty (e.g. "task:\nwhat-done:") isn't
  // usable structured data — fall back to the raw block rather than
  // rendering two blank fields.
  if (!task || !whatDone) return { raw: block };

  return { task, whatDone, raw: block };
}

/**
 * Parses a full summary string into an ordered list of items. Never throws
 * and never drops content — an empty/whitespace-only summary returns an
 * empty array, everything else returns at least one item.
 */
export function parseEntrySummary(summary: string): ParsedLogItem[] {
  const trimmed = summary.trim();
  if (!trimmed) return [];
  return splitBlocks(trimmed).map(parseBlock);
}

/** True if at least one block in the summary matched the structured task/what-done format. */
export function isStructuredSummary(summary: string): boolean {
  return parseEntrySummary(summary).some((item) => item.task && item.whatDone);
}
