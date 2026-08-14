import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { Check, Plus } from "lucide-react";
import { auth } from "@/lib/better-auth";

export default async function WorkspacesPage() {
  const reqHeaders = await headers();
  const session = await auth.api.getSession({ headers: reqHeaders });
  if (!session) {
    redirect("/sign-in");
  }

  const organizations = await auth.api.listOrganizations({ headers: reqHeaders });

  return (
    <main className="flex min-h-full flex-1 items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <h1 className="text-lg font-semibold text-foreground">Your workspaces</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Pick one to open its desk, or start a new one.
          </p>
        </div>

        <div className="flex flex-col gap-2">
          {organizations.length === 0 ? (
            <p className="rounded-2xl border border-border bg-card p-6 text-center text-sm text-muted-foreground">
              No workspaces yet.
            </p>
          ) : (
            organizations.map((org) => (
              <Link
                key={org.id}
                href={`/workspace/${org.slug}`}
                className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4 shadow-sm transition-colors hover:bg-muted/40"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#1b6ef3] text-white">
                  <Check className="h-4 w-4 stroke-[3]" />
                </div>
                <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">
                  {org.name}
                </span>
              </Link>
            ))
          )}

          <Link
            href="/onboarding"
            className="flex items-center gap-3 rounded-2xl border border-dashed border-border p-4 text-sm text-[#8ab4f8] transition-colors hover:bg-muted/40"
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/5">
              <Plus className="h-4 w-4" />
            </div>
            New workspace
          </Link>
        </div>
      </div>
    </main>
  );
}
