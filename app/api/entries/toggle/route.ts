import { NextResponse } from "next/server";
import { z } from "zod";
import { toggleEntryCompletion } from "@/lib/worklog";

const schema = z.object({
  id: z.string().uuid(),
  completed: z.boolean(),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = schema.parse(body);
    const updated = await toggleEntryCompletion(parsed.id, parsed.completed);
    return NextResponse.json(updated);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to toggle completion";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
