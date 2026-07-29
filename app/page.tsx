import { AddEntryRow } from "@/components/add-entry-row";
import { EntryRow } from "@/components/entry-row";
import { getRecentEntries } from "@/lib/worklog";

export const dynamic = "force-dynamic";

export default async function Home() {
  const entries = await getRecentEntries();

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-6 py-10">
      <div className="bg-card rounded-2xl border p-5">
        <h1 className="mb-3 text-lg font-semibold tracking-tight">Worklog</h1>

        <AddEntryRow />

        {entries.length === 0 ? (
          <p className="text-muted-foreground py-6 text-center text-sm">
            No entries yet.
          </p>
        ) : (
          <div className="divide-border mt-1 flex flex-col divide-y">
            {entries.map((entry) => (
              <EntryRow key={entry.id} entry={entry} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
