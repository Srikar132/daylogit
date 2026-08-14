import { describe, expect, it } from "vitest";
import { addDaysIST, formatDateLabel, formatFullDate, todayIST } from "@/lib/date";

describe("todayIST", () => {
  it("returns a YYYY-MM-DD string", () => {
    expect(todayIST()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe("addDaysIST", () => {
  it("subtracts a day", () => {
    expect(addDaysIST("2026-07-29", -1)).toBe("2026-07-28");
  });

  it("adds a day", () => {
    expect(addDaysIST("2026-07-29", 1)).toBe("2026-07-30");
  });

  it("crosses a year boundary", () => {
    expect(addDaysIST("2026-01-01", -1)).toBe("2025-12-31");
  });

  it("is a no-op for zero days", () => {
    expect(addDaysIST("2026-07-29", 0)).toBe("2026-07-29");
  });
});

describe("formatDateLabel", () => {
  it("labels today as 'Today'", () => {
    expect(formatDateLabel(todayIST())).toBe("Today");
  });

  it("labels yesterday as 'Yesterday'", () => {
    expect(formatDateLabel(addDaysIST(todayIST(), -1))).toBe("Yesterday");
  });

  it("labels older dates as 'Mon D'", () => {
    expect(formatDateLabel("2020-01-01")).toBe("Jan 1");
  });
});

describe("formatFullDate", () => {
  it("formats as 'Month D, YYYY'", () => {
    expect(formatFullDate("2026-07-29")).toBe("July 29, 2026");
  });
});
