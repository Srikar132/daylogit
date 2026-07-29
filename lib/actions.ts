"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { CATEGORIES, PROJECTS } from "@/lib/constants";
import {
  WorklogError,
  createOrAppendEntry,
  softDeleteEntry,
  updateEntry,
} from "@/lib/worklog";

export type ActionState = { error?: string };

const createSchema = z.object({
  project: z.enum(PROJECTS),
  category: z.array(z.enum(CATEGORIES)).min(1, "Pick at least one category."),
  summary: z.string(),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
});

function errorMessage(err: unknown): string {
  if (err instanceof WorklogError) return err.message;
  if (err instanceof z.ZodError)
    return err.issues[0]?.message ?? "Invalid input.";
  return "Something went wrong. Please try again.";
}

export async function createEntryAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = createSchema.safeParse({
    project: formData.get("project"),
    category: formData.getAll("category"),
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
  id: z.uuid(),
  project: z.enum(PROJECTS),
  category: z.array(z.enum(CATEGORIES)).min(1, "Pick at least one category."),
  summary: z.string(),
});

export async function updateEntryAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = updateSchema.safeParse({
    id: formData.get("id"),
    project: formData.get("project"),
    category: formData.getAll("category"),
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
  const id = z.uuid().parse(formData.get("id"));
  await softDeleteEntry(id);
  revalidatePath("/");
}
