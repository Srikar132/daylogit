import { NextResponse } from "next/server";
import { z } from "zod";
import { getRequestIdentity } from "@/lib/api-auth";
import { canWriteEntries } from "@/lib/permissions";
import { updateEntryStatus } from "@/lib/worklog";

const schema = z.object({
  entryId: z.string().uuid(),
  status: z.enum(["todo", "in_progress", "completed"]),
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
    const updated = await updateEntryStatus(identity.organizationId, parsed.entryId, parsed.status);
    return NextResponse.json(updated);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to move entry";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
