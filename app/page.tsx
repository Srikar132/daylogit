import { WorklogDashboard } from "@/components/worklog-dashboard";
import { getBoardData } from "@/lib/worklog";
import { todayIST } from "@/lib/date";

export const dynamic = "force-dynamic";

interface HomePageProps {
  searchParams?: Promise<{
    today?: string;
    date?: string;
  }>;
}

export default async function Home(props: HomePageProps) {
  const searchParams = (await props.searchParams) ?? {};

  const isToday = searchParams.today !== "false";
  const dateFilter = typeof searchParams.date === "string" ? searchParams.date : (isToday ? todayIST() : undefined);

  const { sections, allSectionList } = await getBoardData({
    filterToday: isToday,
    date: dateFilter,
  });

  return (
    <WorklogDashboard
      sections={sections}
      allSectionList={allSectionList}
      isToday={isToday}
      currentDate={dateFilter}
    />
  );
}
