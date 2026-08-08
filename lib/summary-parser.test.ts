import { describe, expect, it } from "vitest";
import { isStructuredSummary, parseWorklogSummary } from "./summary-parser";

describe("parseWorklogSummary", () => {
  it("parses a single task/what-done block with no trailing delimiter", () => {
    const summary = "task: add search to dropdowns\nwhat-done: converted 5 pickers to combobox";
    expect(parseWorklogSummary(summary)).toEqual([
      {
        task: "add search to dropdowns",
        whatDone: "converted 5 pickers to combobox",
        raw: summary,
      },
    ]);
  });

  it("parses multiple blocks separated by a --- delimiter", () => {
    const summary = [
      "task: add search to dropdowns",
      "what-done: converted 5 pickers to combobox",
      "---",
      "task: fix resubmit bug",
      "what-done: gated button off for brand templates",
    ].join("\n");

    const items = parseWorklogSummary(summary);
    expect(items).toHaveLength(2);
    expect(items[0]).toMatchObject({
      task: "add search to dropdowns",
      whatDone: "converted 5 pickers to combobox",
    });
    expect(items[1]).toMatchObject({
      task: "fix resubmit bug",
      whatDone: "gated button off for brand templates",
    });
  });

  it("handles a trailing --- after the last block", () => {
    const summary = "task: A\nwhat-done: B\n---\n";
    expect(parseWorklogSummary(summary)).toHaveLength(1);
  });

  it("tolerates extra blank lines around the delimiter", () => {
    const summary = "task: A\nwhat-done: B\n\n\n---\n\n\ntask: C\nwhat-done: D";
    const items = parseWorklogSummary(summary);
    expect(items).toHaveLength(2);
    expect(items[0].task).toBe("A");
    expect(items[1].task).toBe("C");
  });

  it("handles CRLF line endings", () => {
    const summary = "task: A\r\nwhat-done: B\r\n---\r\ntask: C\r\nwhat-done: D\r\n";
    const items = parseWorklogSummary(summary);
    expect(items).toHaveLength(2);
    expect(items[0]).toMatchObject({ task: "A", whatDone: "B" });
    expect(items[1]).toMatchObject({ task: "C", whatDone: "D" });
  });

  it("is case-insensitive and tolerates 'what done'/'whatdone' label spelling", () => {
    const variants = [
      "Task: A\nWhat-Done: B",
      "TASK: A\nWHATDONE: B",
      "task: A\nwhat done: B",
    ];
    for (const summary of variants) {
      expect(parseWorklogSummary(summary)).toEqual([
        { task: "A", whatDone: "B", raw: summary.trim() },
      ]);
    }
  });

  it("supports a multi-line what-done value", () => {
    const summary = "task: A\nwhat-done: line one\nline two";
    const items = parseWorklogSummary(summary);
    expect(items[0].whatDone).toBe("line one\nline two");
  });

  it("falls back to raw text for a block with only a task label (no what-done)", () => {
    const summary = "task: A only, no what-done line";
    const items = parseWorklogSummary(summary);
    expect(items).toEqual([{ raw: summary }]);
    expect(items[0].task).toBeUndefined();
  });

  it("falls back to raw text for a block with empty labels", () => {
    const summary = "task:\nwhat-done:";
    expect(parseWorklogSummary(summary)).toEqual([{ raw: summary }]);
  });

  it("falls back to raw text for legacy unstructured prose (no labels at all)", () => {
    const summary = "Fixed the login bug and deployed to prod.";
    expect(parseWorklogSummary(summary)).toEqual([{ raw: summary }]);
  });

  it("returns an empty array for an empty or whitespace-only summary", () => {
    expect(parseWorklogSummary("")).toEqual([]);
    expect(parseWorklogSummary("   \n  \t ")).toEqual([]);
  });

  it("mixes a structured block with a trailing unstructured one", () => {
    const summary = "task: A\nwhat-done: B\n---\nsome unrelated trailing note";
    const items = parseWorklogSummary(summary);
    expect(items).toHaveLength(2);
    expect(items[0]).toMatchObject({ task: "A", whatDone: "B" });
    expect(items[1]).toEqual({ raw: "some unrelated trailing note" });
  });
});

describe("isStructuredSummary", () => {
  it("is true when at least one block is structured", () => {
    expect(isStructuredSummary("task: A\nwhat-done: B")).toBe(true);
  });

  it("is false for legacy unstructured prose", () => {
    expect(isStructuredSummary("Fixed the login bug and deployed to prod.")).toBe(false);
  });

  it("is false for an empty summary", () => {
    expect(isStructuredSummary("")).toBe(false);
  });
});
