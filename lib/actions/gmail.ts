"use server";

import { headers } from "next/headers";
import { auth } from "@/lib/better-auth";
import { requireViewerContext } from "@/lib/workspace";
import { fetchTodaysMessages, GMAIL_READONLY_SCOPE, type GmailMessageSummary } from "@/lib/gmail";

export type GmailStatus = { connected: boolean };
export type TodayMailResult = { messages?: GmailMessageSummary[]; error?: string };

async function getGoogleAccessToken(): Promise<string | null> {
  const reqHeaders = await headers();
  try {
    const token = await auth.api.getAccessToken({
      headers: reqHeaders,
      body: { providerId: "google" },
    });
    return token.scopes.includes(GMAIL_READONLY_SCOPE) ? token.accessToken : null;
  } catch {
    return null;
  }
}

export async function getGmailStatus(): Promise<GmailStatus> {
  await requireViewerContext();
  const accessToken = await getGoogleAccessToken();
  return { connected: accessToken !== null };
}

/** Today's raw messages (subject/from/snippet) for the signed-in Google account. */
export async function getTodayMessages(): Promise<TodayMailResult> {
  await requireViewerContext();

  const accessToken = await getGoogleAccessToken();
  if (!accessToken) {
    return { error: "Gmail isn't connected yet." };
  }

  try {
    const messages = await fetchTodaysMessages(accessToken);
    return { messages };
  } catch (err) {
    console.error("Gmail fetch failed", err);
    return { error: "Couldn't reach Gmail. Try again shortly." };
  }
}
