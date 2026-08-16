import { Suspense } from "react";
import Image from "next/image";
import Link from "next/link";
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
    <main className="flex min-h-full flex-1 flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-8 shadow-sm">
        <div className="mb-8 text-center flex flex-col items-center">
          <div className="mb-4 relative h-14 w-14 overflow-hidden rounded-2xl bg-white/5 p-2 border border-white/10 shadow-lg">
            <Image
              src="/logo.png"
              alt="Helm Logo"
              width={56}
              height={56}
              className="h-full w-full object-contain"
              priority
            />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">Sign in to Helm</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Your daily progress desk, controlled by you and your AI.
          </p>
        </div>
        <Suspense fallback={null}>
          <OAuthButtons callbackURL="/workspaces" />
        </Suspense>
      </div>

      {/* Footer Links */}
      <footer className="mt-8 text-center text-xs text-muted-foreground flex items-center gap-4">
        <Link href="/terms" className="hover:text-foreground transition-colors">
          Terms of Service
        </Link>
        <span>&bull;</span>
        <Link href="/policies" className="hover:text-foreground transition-colors">
          Privacy & Policies
        </Link>
      </footer>
    </main>
  );
}
