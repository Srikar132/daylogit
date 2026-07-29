import { AddEntryForm } from "@/components/add-entry-form";
import { EmptyState } from "@/components/empty-state";
import { EntryCard } from "@/components/entry-card";
import { Separator } from "@/components/ui/separator";
import { formatDateLabel, todayIST } from "@/lib/date";
import { getRecentEntries, type EntryRow } from "@/lib/worklog";

export const dynamic = "force-dynamic";

function groupByDate(rows: EntryRow[]): Map<string, EntryRow[]> {
  const grouped = new Map<string, EntryRow[]>();
  for (const row of rows) {
    const bucket = grouped.get(row.date);
    if (bucket) bucket.push(row);
    else grouped.set(row.date, [row]);
  }
  return grouped;
}

export default async function Home() {
  const rows = await getRecentEntries();
  const today = todayIST();
  const grouped = groupByDate(rows);
  const todayEntries = grouped.get(today) ?? [];
  const otherDates = [...grouped.keys()]
    .filter((date) => date !== today)
    .sort((a, b) => (a < b ? 1 : -1));

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-8 px-6 py-10">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Worklog</h1>
        <p className="text-muted-foreground text-sm">
          {formatDateLabel(today)} · {todayEntries.length} entr
          {todayEntries.length === 1 ? "y" : "ies"} logged today
        </p>
      </header>

      <AddEntryForm />

      <section className="flex flex-col gap-4">
        <h2 className="text-muted-foreground text-sm font-medium">Today</h2>
        {todayEntries.length === 0 ? (
          <EmptyState label="today" />
        ) : (
          <div className="flex flex-col gap-4">
            {todayEntries.map((entry) => (
              <EntryCard key={entry.id} entry={entry} />
            ))}
          </div>
        )}
      </section>

      {otherDates.map((date) => (
        <section key={date} className="flex flex-col gap-4">
          <Separator />
          <h2 className="text-muted-foreground text-sm font-medium">
            {formatDateLabel(date)}
          </h2>
          <div className="flex flex-col gap-4">
            {(grouped.get(date) ?? []).map((entry) => (
              <EntryCard key={entry.id} entry={entry} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
