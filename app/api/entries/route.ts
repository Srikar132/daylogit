import { NextResponse } from "next/server";
import { z } from "zod";
import { hasValidApiKey } from "@/lib/auth";
import {
  WorklogError,
  searchEntries,
  softDeleteEntry,
  updateEntry,
} from "@/lib/worklog";

function unauthorized(): NextResponse {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

const searchParamsSchema = z.object({
  from: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  to: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  offset: z.coerce.number().int().min(0).optional(),
});

export async function GET(request: Request): Promise<NextResponse> {
  if (!hasValidApiKey(request)) return unauthorized();

  const { searchParams } = new URL(request.url);
  const parsed = searchParamsSchema.safeParse({
    from: searchParams.get("from") ?? undefined,
    to: searchParams.get("to") ?? undefined,
    limit: searchParams.get("limit") ?? undefined,
    offset: searchParams.get("offset") ?? undefined,
  });

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid query parameters" },
      { status: 400 },
    );
  }

  const result = await searchEntries(parsed.data);
  return NextResponse.json(result);
}

const patchBodySchema = z.object({
  id: z.string().uuid(),
  title: z.string().optional(),
  summary: z.string().optional(),
});

export async function PATCH(request: Request): Promise<NextResponse> {
  if (!hasValidApiKey(request)) return unauthorized();

  const parsed = patchBodySchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 },
    );
  }

  try {
    const { id, ...patch } = parsed.data;
    const row = await updateEntry(id, patch);
    return NextResponse.json(row);
  } catch (err) {
    if (err instanceof WorklogError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    throw err;
  }
}

const deleteBodySchema = z.object({ id: z.string().uuid() });

export async function DELETE(request: Request): Promise<NextResponse> {
  if (!hasValidApiKey(request)) return unauthorized();

  const parsed = deleteBodySchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 },
    );
  }

  const row = await softDeleteEntry(parsed.data.id);
  if (!row) {
    return NextResponse.json({ error: "Entry not found" }, { status: 404 });
  }

  return NextResponse.json(row);
}
