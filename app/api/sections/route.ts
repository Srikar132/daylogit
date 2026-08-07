import { NextResponse } from "next/server";
import { z } from "zod";
import { createSection, getSections, updateSectionOrder } from "@/lib/worklog";

export async function GET() {
  const sectionsList = await getSections();
  return NextResponse.json(sectionsList);
}

const createSchema = z.object({
  name: z.string().min(1),
  date: z.string().optional(),
});

const reorderSchema = z.object({
  orders: z.array(
    z.object({
      id: z.string(),
      order: z.number(),
    }),
  ),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    if (body.orders) {
      const parsed = reorderSchema.parse(body);
      await updateSectionOrder(parsed.orders);
      return NextResponse.json({ success: true });
    } else {
      const parsed = createSchema.parse(body);
      const newSection = await createSection(parsed.name, parsed.date);
      return NextResponse.json(newSection);
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Invalid request";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
