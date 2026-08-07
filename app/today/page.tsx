import { redirect } from "next/navigation";
import { todayIST } from "@/lib/date";

export default function TodayPage() {
  redirect(`/?date=${todayIST()}`);
}
