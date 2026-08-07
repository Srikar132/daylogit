import { redirect } from "next/navigation";
import { WorklogDashboard } from "@/components/worklog-dashboard";
import { getBoardData } from "@/lib/worklog";
import { todayIST } from "@/lib/date";

export const dynamic = "force-dynamic";

interface HomePageProps {
  searchParams?: Promise<{
    date?: string;
  }>;
}

export default async function Home(props: HomePageProps) {
  const searchParams = (await props.searchParams) ?? {};

  const date =
    typeof searchParams.date === "string" && searchParams.date.trim()
      ? searchParams.date.trim()
      : undefined;

  if (!date) {
    redirect(`/?date=${todayIST()}`);
  }

  const { sections } = await getBoardData({ date });

  return <WorklogDashboard sections={sections} />;
}
