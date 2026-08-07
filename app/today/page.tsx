import { redirect } from "next/navigation";
import { todayIST } from "@/lib/date";

export default function TodayPage() {
  const todayStr = todayIST();
  redirect(`/?today=true&date=${todayStr}`);
}
