import { NextResponse } from "next/server";
import { z } from "zod";
import { getRequestIdentity } from "@/lib/api-auth";
import { getEntryById } from "@/lib/worklog";

const paramsSchema = z.object({ id: z.string().uuid() });

/**
 * Session-gated, same-origin (like /api/sections and /api/entries/move) —
 * this is the board UI's own lazy full-entry fetch for the detail dialog,
 * not the API-key-gated /api/entries route meant for external/MCP clients.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const identity = await getRequestIdentity(request);
  if (!identity) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = paramsSchema.safeParse(await params);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid entry id" }, { status: 400 });
  }

  const entry = await getEntryById(identity.organizationId, parsed.data.id);
  if (!entry) {
    return NextResponse.json({ error: "Entry not found" }, { status: 404 });
  }

  return NextResponse.json(entry);
}
