import { describe, expect, it } from "vitest";
import { previewSummary } from "./worklog";

describe("previewSummary", () => {
  it("returns short summaries unchanged", () => {
    expect(previewSummary("short summary")).toBe("short summary");
  });

  it("truncates summaries over 200 characters with an ellipsis", () => {
    const long = "x".repeat(250);
    const preview = previewSummary(long);
    expect(preview.endsWith("…")).toBe(true);
    expect(preview.length).toBe(201);
  });
});
