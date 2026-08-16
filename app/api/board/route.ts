import { NextResponse } from "next/server";
import { z } from "zod";
import { getRequestIdentity } from "@/lib/api-auth";
import { getBoardData } from "@/lib/worklog";
import { WORK_TYPES, type WorkType } from "@/lib/constants";

const WORK_TYPE_VALUES = WORK_TYPES.map((t) => t.value) as [WorkType, ...WorkType[]];

const querySchema = z.object({
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  search: z.string().optional(),
  workTypes: z.array(z.enum(WORK_TYPE_VALUES)).optional(),
});

export async function GET(request: Request) {
  const identity = await getRequestIdentity(request);
  if (!identity) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const workTypesParam = searchParams.get("workTypes");
  const parsed = querySchema.safeParse({
    date: searchParams.get("date") ?? undefined,
    search: searchParams.get("search") ?? undefined,
    workTypes: workTypesParam ? workTypesParam.split(",") : undefined,
  });
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid query" }, { status: 400 });
  }

  // No `date` = every entry across all dates, not just today's — the board
  // is a single unified view by default now.
  const { columns } = await getBoardData(identity.organizationId, {
    date: parsed.data.date,
    search: parsed.data.search,
    workTypes: parsed.data.workTypes,
  });

  return NextResponse.json({ columns });
}
