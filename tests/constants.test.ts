import { describe, expect, it } from "vitest";
import { isFillerSummary } from "@/lib/constants";

describe("isFillerSummary", () => {
  it("rejects summaries under the minimum length", () => {
    expect(isFillerSummary("fixed bug")).toBe(true);
  });

  it("rejects known filler phrases regardless of case/whitespace", () => {
    expect(isFillerSummary("  Worked On Stuff  ")).toBe(true);
    expect(isFillerSummary("nothing much")).toBe(true);
  });

  it("accepts specific, non-filler summaries", () => {
    expect(
      isFillerSummary("Fixed the timezone bug in the today() helper"),
    ).toBe(false);
  });
});
