import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/better-auth";
import { CreateWorkspaceForm } from "@/components/auth/create-workspace-form";

export default async function OnboardingPage() {
  const reqHeaders = await headers();
  const session = await auth.api.getSession({ headers: reqHeaders });
  if (!session) {
    redirect("/sign-in");
  }

  return (
    <main className="flex min-h-full flex-1 items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-8 shadow-sm">
        <div className="mb-8 text-center">
          <h1 className="text-lg font-semibold text-foreground">Create your workspace</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            One place for your daily logs, your team&apos;s pulse, and your AI to act through.
          </p>
        </div>
        <CreateWorkspaceForm />
      </div>
    </main>
  );
}
