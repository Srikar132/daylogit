"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { APIError } from "better-auth/api";
import { auth } from "@/lib/better-auth";

export type WorkspaceActionState = { error?: string };

const createWorkspaceSchema = z.object({
  name: z.string().trim().min(1, "Workspace name is required.").max(80, "Keep it under 80 characters."),
});

function slugify(name: string): string {
  const base = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
  const suffix = Math.random().toString(36).slice(2, 7);
  return `${base || "workspace"}-${suffix}`;
}

export async function createWorkspaceAction(
  _prevState: WorkspaceActionState,
  formData: FormData,
): Promise<WorkspaceActionState> {
  const parsed = createWorkspaceSchema.safeParse({ name: formData.get("name") });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid workspace name." };
  }
  const { name } = parsed.data;

  const reqHeaders = await headers();
  const session = await auth.api.getSession({ headers: reqHeaders });
  if (!session) {
    redirect("/sign-in");
  }

  let slug: string;
  try {
    const org = await auth.api.createOrganization({
      headers: reqHeaders,
      body: {
        name,
        slug: slugify(name),
      },
    });

    if (!org) {
      return { error: "Could not create workspace. Please try again." };
    }

    await auth.api.setActiveOrganization({
      headers: reqHeaders,
      body: { organizationId: org.id },
    });
    slug = org.slug;
  } catch (err) {
    if (err instanceof APIError) {
      return { error: err.message };
    }
    throw err;
  }

  redirect(`/workspace/${slug}`);
}
