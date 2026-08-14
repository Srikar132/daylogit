import { NextResponse } from "next/server";
import { z } from "zod";
import { getRequestIdentity } from "@/lib/api-auth";
import { getBoardData } from "@/lib/worklog";
import { todayIST } from "@/lib/date";

const querySchema = z.object({
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  search: z.string().optional(),
});

export async function GET(request: Request) {
  const identity = await getRequestIdentity(request);
  if (!identity) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const parsed = querySchema.safeParse({
    date: searchParams.get("date") ?? undefined,
    search: searchParams.get("search") ?? undefined,
  });
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid query" }, { status: 400 });
  }

  const date = parsed.data.date ?? todayIST();
  const { columns } = await getBoardData(identity.organizationId, {
    date,
    search: parsed.data.search,
  });

  return NextResponse.json({ date, columns });
}
