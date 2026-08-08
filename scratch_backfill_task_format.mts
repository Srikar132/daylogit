import { config } from "dotenv";
config({ path: ".env.local" });

const { isNull, eq } = await import("drizzle-orm");
const { db, entries } = await import("./lib/db");
const { isStructuredSummary } = await import("./lib/summary-parser");

const DRY_RUN = process.argv.includes("--dry-run");

async function main() {
  const rows = await db.select().from(entries).where(isNull(entries.deletedAt));
  const targets = rows.filter((r) => !isStructuredSummary(r.summary));

  console.log(`${targets.length} of ${rows.length} active entries need backfilling.`);

  for (const row of targets) {
    const task = row.title?.trim() || row.summary.split("\n")[0].slice(0, 80);
    const newSummary = `task: ${task}\nwhat-done: ${row.summary}`;

    console.log(`\n--- ${row.id} (${row.date}) ---`);
    console.log(newSummary);

    if (!DRY_RUN) {
      await db.update(entries).set({ summary: newSummary }).where(eq(entries.id, row.id));
    }
  }

  if (DRY_RUN) {
    console.log("\nDry run only -- nothing written. Re-run without --dry-run to apply.");
  } else {
    console.log(`\nUpdated ${targets.length} entries.`);
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => process.exit());
