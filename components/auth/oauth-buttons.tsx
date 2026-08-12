"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";

function GithubIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" fill="currentColor" aria-hidden="true">
      <path d="M12 .5C5.65.5.5 5.65.5 12c0 5.09 3.29 9.4 7.86 10.93.57.1.78-.25.78-.55 0-.27-.01-1.17-.02-2.13-3.2.7-3.87-1.36-3.87-1.36-.53-1.33-1.29-1.69-1.29-1.69-1.05-.72.08-.7.08-.7 1.16.08 1.78 1.2 1.78 1.2 1.04 1.77 2.72 1.26 3.38.96.1-.75.4-1.26.72-1.55-2.56-.29-5.25-1.28-5.25-5.7 0-1.26.45-2.29 1.19-3.1-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.18 1.18a11.1 11.1 0 0 1 5.79 0c2.2-1.49 3.17-1.18 3.17-1.18.64 1.59.24 2.76.12 3.05.74.81 1.19 1.84 1.19 3.1 0 4.43-2.7 5.4-5.27 5.69.42.36.78 1.07.78 2.16 0 1.56-.01 2.81-.01 3.19 0 .3.2.66.79.55A11.51 11.51 0 0 0 23.5 12C23.5 5.65 18.35.5 12 .5Z" />
    </svg>
  );
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" aria-hidden="true">
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.99.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
  );
}

const OAUTH_ERROR_MESSAGES: Record<string, string> = {
  signup_disabled: "New sign-ups aren't open right now.",
  account_not_linked: "That email is already registered a different way — try the original sign-in method.",
  oauth_callback_error: "The provider didn't complete sign-in. Please try again.",
  unable_to_create_user: "Couldn't create your account. Please try again.",
  invalid_callback: "That sign-in link expired or was already used.",
  access_denied: "Sign-in was cancelled.",
};

function messageForErrorCode(code: string | null): string | null {
  if (!code) return null;
  return OAUTH_ERROR_MESSAGES[code] ?? "Something went wrong signing you in. Please try again.";
}

export function OAuthButtons({ callbackURL }: { callbackURL: string }) {
  const searchParams = useSearchParams();
  const [pending, setPending] = useState<"google" | "github" | null>(null);
  const [error, setError] = useState<string | null>(
    messageForErrorCode(searchParams.get("error")),
  );

  async function signInWith(provider: "google" | "github") {
    setError(null);
    setPending(provider);
    const { error: signInError } = await authClient.signIn.social({
      provider,
      callbackURL,
      errorCallbackURL: "/sign-in",
    });
    if (signInError) {
      setError(
        messageForErrorCode(signInError.code ?? null) ??
          signInError.message ??
          "Something went wrong signing you in. Please try again.",
      );
    }
    setPending(null);
  }

  return (
    <div className="flex flex-col gap-2.5">
      {error && (
        <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          <AlertCircle className="mt-0.5 size-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}
      <Button
        variant="outline"
        size="lg"
        disabled={pending !== null}
        onClick={() => signInWith("google")}
        className="justify-center gap-2.5"
      >
        {pending === "google" ? <Loader2 className="size-4 animate-spin" /> : <GoogleIcon />}
        Continue with Google
      </Button>
      <Button
        variant="outline"
        size="lg"
        disabled={pending !== null}
        onClick={() => signInWith("github")}
        className="justify-center gap-2.5"
      >
        {pending === "github" ? <Loader2 className="size-4 animate-spin" /> : <GithubIcon />}
        Continue with GitHub
      </Button>
    </div>
  );
}
