"use server";

import dns from "node:dns/promises";
import net from "node:net";
import { z } from "zod";
import ogs from "open-graph-scraper";
import { requireViewerContext } from "@/lib/workspace";

export type BookmarkData = {
  url: string;
  title: string;
  description?: string;
  image?: string;
  siteName?: string;
  favicon?: string;
};

function isPrivateIPv4(ip: string): boolean {
  const parts = ip.split(".").map(Number);
  if (parts.length !== 4 || parts.some((p) => Number.isNaN(p))) return true;
  const [a, b] = parts;
  return a === 127 || a === 10 || a === 0 || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 169 && b === 254);
}

function isPrivateIPv6(ip: string): boolean {
  const lower = ip.toLowerCase();
  return lower === "::1" || lower.startsWith("fc") || lower.startsWith("fd") || lower.startsWith("fe80");
}

function isPrivateIP(ip: string): boolean {
  return net.isIP(ip) === 4 ? isPrivateIPv4(ip) : isPrivateIPv6(ip);
}

/** Resolves the hostname and rejects private/loopback/link-local targets
 *  before ever fetching — this is a server fetching a URL the user typed,
 *  so without this a request could be pointed at internal infrastructure.
 *  Not a general-purpose SSRF proxy: redirects the fetch follows afterward
 *  aren't re-validated, which is an accepted trade-off for this feature's
 *  scope (a link-preview widget, not an internet-facing fetch gateway). */
async function assertPublicHost(hostname: string): Promise<void> {
  if (net.isIP(hostname)) {
    if (isPrivateIP(hostname)) throw new Error("That URL points to a private/internal address.");
    return;
  }
  if (hostname === "localhost") throw new Error("That URL points to a local address.");

  const addresses = await dns.lookup(hostname, { all: true });
  if (addresses.some(({ address }) => isPrivateIP(address))) {
    throw new Error("That URL points to a private/internal address.");
  }
}

const urlSchema = z.string().trim().url();

/** Fetches OG/Twitter-card metadata for the bookmark widget. Runs
 *  server-side — the target site won't allow this fetch from the browser
 *  (CORS), and the URL is untrusted input either way. */
export async function getBookmarkMetadata(rawUrl: string): Promise<{ data?: BookmarkData; error?: string }> {
  await requireViewerContext();

  const parsed = urlSchema.safeParse(rawUrl);
  if (!parsed.success) return { error: "Enter a valid URL." };

  let url: URL;
  try {
    url = new URL(parsed.data);
  } catch {
    return { error: "Enter a valid URL." };
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    return { error: "Only http/https URLs are supported." };
  }

  try {
    await assertPublicHost(url.hostname);
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Couldn't verify that URL." };
  }

  // A site with no OG tags (or one that blocks scraping/times out) still
  // makes a perfectly valid bookmark — just a plainer one. Only the checks
  // above (bad URL, private address) should actually block saving.
  const ogsResult = await ogs({ url: url.toString(), timeout: 8 }).catch(() => null);
  const result = ogsResult && !ogsResult.error ? ogsResult.result : null;

  return {
    data: {
      url: url.toString(),
      title: result?.ogTitle || url.hostname,
      description: result?.ogDescription,
      image: result?.ogImage?.[0]?.url,
      siteName: result?.ogSiteName,
      favicon: result?.favicon,
    },
  };
}
