export const GMAIL_READONLY_SCOPE = "https://www.googleapis.com/auth/gmail.readonly";

type GmailHeader = { name: string; value: string };

export type GmailMessageSummary = {
  id: string;
  threadId?: string;
  subject: string;
  from: string;
  snippet: string;
  date?: string;
  unread?: boolean;
};

export type GmailFullMessage = GmailMessageSummary & {
  bodyText: string;
  bodyHtml?: string;
};

function headerValue(headers: GmailHeader[] | undefined, name: string): string {
  return headers?.find((h) => h.name.toLowerCase() === name.toLowerCase())?.value ?? "";
}

/** Today's messages for the signed-in user. */
export async function fetchTodaysMessages(accessToken: string, maxResults = 20): Promise<GmailMessageSummary[]> {
  const listUrl = new URL("https://gmail.googleapis.com/gmail/v1/users/me/messages");
  listUrl.searchParams.set("maxResults", String(maxResults));
  listUrl.searchParams.set("q", "newer_than:1d in:inbox");

  const listRes = await fetch(listUrl, { headers: { Authorization: `Bearer ${accessToken}` } });
  if (!listRes.ok) {
    if (listRes.status === 401) {
      throw new Error("Gmail authorization token expired or invalid (401).");
    }
    throw new Error(`Gmail list request failed (${listRes.status}).`);
  }
  const { messages } = (await listRes.json()) as { messages?: { id: string; threadId?: string }[] };
  if (!messages || messages.length === 0) return [];

  const details = await Promise.all(
    messages.map(async (m) => {
      const detailUrl = new URL(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${m.id}`);
      detailUrl.searchParams.set("format", "metadata");
      detailUrl.searchParams.append("metadataHeaders", "Subject");
      detailUrl.searchParams.append("metadataHeaders", "From");
      detailUrl.searchParams.append("metadataHeaders", "Date");

      const res = await fetch(detailUrl, { headers: { Authorization: `Bearer ${accessToken}` } });
      if (!res.ok) return null;
      const data = await res.json();
      return {
        id: m.id,
        ...(m.threadId ? { threadId: m.threadId } : {}),
        subject: headerValue(data.payload?.headers, "Subject") || "(no subject)",
        from: headerValue(data.payload?.headers, "From"),
        snippet: data.snippet ?? "",
        date: headerValue(data.payload?.headers, "Date"),
        unread: Array.isArray(data.labelIds) ? data.labelIds.includes("UNREAD") : false,
      } satisfies GmailMessageSummary;
    }),
  );

  return details.filter((d): d is NonNullable<typeof d> => d !== null);
}

type GmailMessagePart = {
  mimeType?: string;
  body?: { data?: string };
  parts?: GmailMessagePart[];
};

function parseBodyParts(part: GmailMessagePart): { text: string; html: string } {
  let text = "";
  let html = "";

  if (part.mimeType === "text/plain" && part.body?.data) {
    text = Buffer.from(part.body.data, "base64url").toString("utf-8");
  } else if (part.mimeType === "text/html" && part.body?.data) {
    html = Buffer.from(part.body.data, "base64url").toString("utf-8");
  }

  if (part.parts && Array.isArray(part.parts)) {
    for (const subPart of part.parts) {
      const subResult = parseBodyParts(subPart);
      if (subResult.text && !text) text = subResult.text;
      if (subResult.html && !html) html = subResult.html;
    }
  }

  return { text: text.trim(), html: html.trim() };
}

/** Fetch individual message details including parsed body content. */
export async function fetchSingleMessageDetails(
  accessToken: string,
  messageId: string,
): Promise<GmailFullMessage | null> {
  const detailUrl = new URL(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}`);
  detailUrl.searchParams.set("format", "full");

  const res = await fetch(detailUrl, { headers: { Authorization: `Bearer ${accessToken}` } });
  if (!res.ok) return null;

  const data = await res.json();
  const headers = data.payload?.headers || [];
  const { text, html } = parseBodyParts(data.payload || {});

  return {
    id: data.id,
    threadId: data.threadId,
    subject: headerValue(headers, "Subject") || "(no subject)",
    from: headerValue(headers, "From"),
    snippet: data.snippet ?? "",
    date: headerValue(headers, "Date"),
    unread: Array.isArray(data.labelIds) ? data.labelIds.includes("UNREAD") : false,
    bodyText: text || data.snippet || "No text content available.",
    bodyHtml: html || undefined,
  };
}
