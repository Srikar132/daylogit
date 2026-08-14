export const GMAIL_READONLY_SCOPE = "https://www.googleapis.com/auth/gmail.readonly";

type GmailHeader = { name: string; value: string };

export type GmailMessageSummary = {
  subject: string;
  from: string;
  snippet: string;
};

function headerValue(headers: GmailHeader[] | undefined, name: string): string {
  return headers?.find((h) => h.name.toLowerCase() === name.toLowerCase())?.value ?? "";
}

/** Today's messages (subject/from/snippet only — never the full body). */
export async function fetchTodaysMessages(accessToken: string, maxResults = 15): Promise<GmailMessageSummary[]> {
  const listUrl = new URL("https://gmail.googleapis.com/gmail/v1/users/me/messages");
  listUrl.searchParams.set("maxResults", String(maxResults));
  listUrl.searchParams.set("q", "newer_than:1d in:inbox");

  const listRes = await fetch(listUrl, { headers: { Authorization: `Bearer ${accessToken}` } });
  if (!listRes.ok) {
    throw new Error(`Gmail list request failed (${listRes.status}).`);
  }
  const { messages } = (await listRes.json()) as { messages?: { id: string }[] };
  if (!messages || messages.length === 0) return [];

  const details = await Promise.all(
    messages.map(async (m) => {
      const detailUrl = new URL(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${m.id}`);
      detailUrl.searchParams.set("format", "metadata");
      detailUrl.searchParams.append("metadataHeaders", "Subject");
      detailUrl.searchParams.append("metadataHeaders", "From");

      const res = await fetch(detailUrl, { headers: { Authorization: `Bearer ${accessToken}` } });
      if (!res.ok) return null;
      const data = await res.json();
      return {
        subject: headerValue(data.payload?.headers, "Subject") || "(no subject)",
        from: headerValue(data.payload?.headers, "From"),
        snippet: data.snippet ?? "",
      } satisfies GmailMessageSummary;
    }),
  );

  return details.filter((d): d is GmailMessageSummary => d !== null);
}
