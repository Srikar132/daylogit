import { Suspense } from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/better-auth";
import { OAuthButtons } from "@/components/auth/oauth-buttons";

export default async function SignInPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (session) {
    redirect("/workspaces");
  }

  return (
    <main className="flex min-h-full flex-1 items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-8 shadow-sm">
        <div className="mb-8 text-center">
          <h1 className="text-lg font-semibold text-foreground">Sign in to Helm</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Your daily progress desk, controlled by you and your AI.
          </p>
        </div>
        <Suspense fallback={null}>
          <OAuthButtons callbackURL="/workspaces" />
        </Suspense>
      </div>
    </main>
  );
}
