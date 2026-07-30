import { WorklogDashboard } from "@/components/worklog-dashboard";
import { getPaginatedEntries } from "@/lib/worklog";

export const dynamic = "force-dynamic";

interface HomePageProps {
  searchParams?: Promise<{
    page?: string;
    pageSize?: string;
    q?: string;
    project?: string;
    today?: string;
    date?: string;
  }>;
}

export default async function Home(props: HomePageProps) {
  const searchParams = (await props.searchParams) ?? {};

  const page = Number(searchParams.page) || 1;
  const pageSize = Number(searchParams.pageSize) || 10;
  const search = typeof searchParams.q === "string" ? searchParams.q : undefined;
  const project = typeof searchParams.project === "string" ? searchParams.project : undefined;
  const isToday = searchParams.today === "true";
  const dateFilter = typeof searchParams.date === "string" ? searchParams.date : undefined;

  const { entries, totalCount, totalPages } = await getPaginatedEntries({
    page,
    pageSize,
    search,
    project,
    filterToday: isToday,
    date: dateFilter,
  });

  return (
    <WorklogDashboard
      entries={entries}
      totalCount={totalCount}
      totalPages={totalPages}
      page={page}
      pageSize={pageSize}
      currentProject={project}
      isToday={isToday}
      currentDate={dateFilter}
    />
  );
}
