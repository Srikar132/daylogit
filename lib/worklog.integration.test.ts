import { eq } from "drizzle-orm";
import { afterAll, describe, expect, it } from "vitest";
import { db, entries } from "./db";
import { createOrAppendEntry, searchEntries, softDeleteEntry } from "./worklog";

// Sentinel date far outside any real usage — safe to write to and hard-delete
// from the live Neon database without touching real worklog history.
const TEST_DATE = "1999-01-01";

describe.skipIf(!process.env.DATABASE_URL)(
  "worklog (live Neon integration)",
  () => {
    afterAll(async () => {
      await db.delete(entries).where(eq(entries.date, TEST_DATE));
    });

    it("creates an entry, appends to it, and merges categories", async () => {
      const first = await createOrAppendEntry({
        project: "Other",
        category: ["Code"],
        summary: "integration test entry one",
        date: TEST_DATE,
      });
      expect(first.summary).toBe("- integration test entry one");
      expect(first.category).toEqual(["Code"]);

      const second = await createOrAppendEntry({
        project: "Other",
        category: ["Debugging"],
        summary: "integration test entry two",
        date: TEST_DATE,
      });
      expect(second.id).toBe(first.id);
      expect(second.summary.split("\n")).toEqual([
        "- integration test entry one",
        "- integration test entry two",
      ]);
      expect(second.category.sort()).toEqual(["Code", "Debugging"]);
    });

    it("finds the entry via searchEntries and soft-deletes it", async () => {
      const { rows } = await searchEntries({
        project: "Other",
        from: TEST_DATE,
        to: TEST_DATE,
      });
      expect(rows).toHaveLength(1);

      const deleted = await softDeleteEntry(rows[0].id);
      expect(deleted?.id).toBe(rows[0].id);

      const deletedAgain = await softDeleteEntry(rows[0].id);
      expect(deletedAgain).toBeUndefined();

      const { rows: afterDelete } = await searchEntries({
        project: "Other",
        from: TEST_DATE,
        to: TEST_DATE,
      });
      expect(afterDelete).toHaveLength(0);
    });

    it("rejects filler summaries", async () => {
      await expect(
        createOrAppendEntry({
          project: "Other",
          category: ["Code"],
          summary: "worked on stuff",
          date: TEST_DATE,
        }),
      ).rejects.toThrow(/too short or too generic/);
    });
  },
);
