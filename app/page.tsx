import { WorklogTable } from "@/components/worklog-table";
import { getRecentEntries } from "@/lib/worklog";

export const dynamic = "force-dynamic";

export default async function Home() {
  const entries = await getRecentEntries();

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col px-6 py-10">
      <h1 className="mb-3 text-lg font-semibold tracking-tight">Worklog</h1>
      <WorklogTable entries={entries} />
    </div>
  );
}
