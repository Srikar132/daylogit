import { NextResponse } from "next/server";
import { z } from "zod";
import { createOrAppendEntry } from "@/lib/worklog";

const schema = z.object({
  title: z.string().optional(),
  summary: z.string().min(1, "Summary is required"),
  sectionId: z.string().optional(),
  sectionName: z.string().optional(),
  date: z.string().optional(),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = schema.parse(body);

    const entry = await createOrAppendEntry({
      title: parsed.title,
      summary: parsed.summary,
      sectionId: parsed.sectionId,
      sectionName: parsed.sectionName || "My Tasks",
      date: parsed.date,
    });

    return NextResponse.json(entry);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to create entry";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
