import { NextResponse } from "next/server";
import { z } from "zod";
import { moveEntryToSection } from "@/lib/worklog";

const schema = z.object({
  entryId: z.string().uuid(),
  targetSection: z.string().min(1),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = schema.parse(body);
    const updated = await moveEntryToSection(parsed.entryId, parsed.targetSection);
    return NextResponse.json(updated);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to move entry";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
