import { NextResponse } from "next/server";
import { z } from "zod";
import { getRequestIdentity } from "@/lib/api-auth";
import { canWriteEntries } from "@/lib/permissions";
import { WORK_TYPES, type WorkType } from "@/lib/constants";
import { createOrAppendEntry } from "@/lib/worklog";

const WORK_TYPE_VALUES = WORK_TYPES.map((t) => t.value) as [WorkType, ...WorkType[]];

const schema = z.object({
  title: z.string().optional(),
  summary: z.string().min(1, "Summary is required"),
  status: z.enum(["todo", "in_progress", "completed"]).optional(),
  workType: z.enum(WORK_TYPE_VALUES).optional(),
  dueDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  date: z.string().optional(),
});

export async function POST(request: Request) {
  const identity = await getRequestIdentity(request);
  if (!identity) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canWriteEntries(identity.role)) {
    return NextResponse.json({ error: "View-only access" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const parsed = schema.parse(body);

    const entry = await createOrAppendEntry(identity.organizationId, identity.userId, {
      title: parsed.title,
      summary: parsed.summary,
      status: parsed.status,
      workType: parsed.workType,
      dueDate: parsed.dueDate,
      date: parsed.date,
    });

    return NextResponse.json(entry);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to create entry";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
