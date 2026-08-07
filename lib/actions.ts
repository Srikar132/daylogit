"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  WorklogError,
  createOrAppendEntry,
  softDeleteEntry,
  updateEntry,
} from "@/lib/worklog";

export type ActionState = { error?: string };

const createSchema = z.object({
  title: z.string().optional(),
  summary: z.string().min(1, "Summary is required."),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
});

function errorMessage(err: unknown): string {
  console.error("Server Action Error:", err);
  if (err instanceof WorklogError) return err.message;
  if (err instanceof z.ZodError)
    return err.issues[0]?.message ?? "Invalid input.";
  if (err instanceof Error) return err.message;
  return "Something went wrong. Please try again.";
}

export async function createEntryAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = createSchema.safeParse({
    title: formData.get("title") || undefined,
    summary: formData.get("summary"),
    date: formData.get("date") || undefined,
  });

  if (!parsed.success) {
    return { error: errorMessage(parsed.error) };
  }

  try {
    await createOrAppendEntry(parsed.data);
  } catch (err) {
    return { error: errorMessage(err) };
  }

  revalidatePath("/");
  return {};
}

const updateSchema = z.object({
  id: z.string().uuid(),
  title: z.string().optional(),
  summary: z.string().min(1, "Summary is required."),
});

export async function updateEntryAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = updateSchema.safeParse({
    id: formData.get("id"),
    title: formData.get("title") || undefined,
    summary: formData.get("summary"),
  });

  if (!parsed.success) {
    return { error: errorMessage(parsed.error) };
  }

  try {
    const { id, ...patch } = parsed.data;
    await updateEntry(id, patch);
  } catch (err) {
    return { error: errorMessage(err) };
  }

  revalidatePath("/");
  return {};
}

export async function deleteEntryAction(formData: FormData): Promise<void> {
  const id = z.string().uuid().parse(formData.get("id"));
  await softDeleteEntry(id);
  revalidatePath("/");
}
