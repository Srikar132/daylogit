export type BookmarkPreview = {
  url: string;
  title: string;
  description?: string;
  image?: string;
  siteName?: string;
  favicon?: string;
};

/** The subset of open-graph-scraper's result this actually reads. Declared
 *  structurally so the resolver stays testable without the scraper. */
export type ScrapedMetadata = {
  ogTitle?: string;
  twitterTitle?: string;
  dcTitle?: string;
  ogDescription?: string;
  twitterDescription?: string;
  ogSiteName?: string;
  ogImage?: { url?: string }[];
  twitterImage?: { url?: string }[];
  favicon?: string;
};

/**
 * Turns a url found in someone else's page into one safe to render here.
 *
 * This is the fix for bookmarks showing THIS app's favicon: a page almost always
 * declares its icon relatively (`/favicon.ico`, `favicon.png`), and storing that
 * string as-is meant the browser resolved it against our origin when rendering
 * the card — so every such bookmark showed our icon instead of the site's.
 * Resolving against the page's own url is what makes it point at the real site.
 *
 * Non-http(s) schemes are dropped rather than resolved: `data:` and `javascript:`
 * both parse fine as URLs and neither belongs in an `img src` fed by a
 * third-party page.
 */
export function absoluteUrl(candidate: string | undefined | null, base: string): string | undefined {
  const trimmed = candidate?.trim();
  if (!trimmed) return undefined;
  try {
    const resolved = new URL(trimmed, base);
    if (resolved.protocol !== "http:" && resolved.protocol !== "https:") return undefined;
    return resolved.toString();
  } catch {
    return undefined;
  }
}

/**
 * Every site has a favicon; far fewer have an OG image. So the card leans on the
 * icon, and this always produces one when the url itself is valid: whatever the
 * page declared, else the `/favicon.ico` convention at that origin. A 404 there
 * is fine — the widget hides a favicon that fails to load.
 */
export function resolveFavicon(declared: string | undefined, pageUrl: string): string | undefined {
  const fromPage = absoluteUrl(declared, pageUrl);
  if (fromPage) return fromPage;
  try {
    return new URL("/favicon.ico", pageUrl).toString();
  } catch {
    return undefined;
  }
}

function firstNonEmpty(...values: (string | undefined)[]): string | undefined {
  for (const value of values) {
    const trimmed = value?.trim();
    if (trimmed) return trimmed;
  }
  return undefined;
}

/**
 * Builds the card's data from whatever the page offered, degrading a step at a
 * time: OG, then Twitter card, then the bare hostname. A site with no OG tags at
 * all still yields a usable bookmark — title from the hostname, plus a favicon —
 * rather than an empty card.
 */
export function resolveBookmarkPreview(pageUrl: string, scraped: ScrapedMetadata | null): BookmarkPreview {
  let hostname = pageUrl;
  try {
    hostname = new URL(pageUrl).hostname.replace(/^www\./, "");
  } catch {
    // pageUrl is validated before this is called; fall back to the raw string.
  }

  return {
    url: pageUrl,
    title: firstNonEmpty(scraped?.ogTitle, scraped?.twitterTitle, scraped?.dcTitle) ?? hostname,
    description: firstNonEmpty(scraped?.ogDescription, scraped?.twitterDescription),
    image: absoluteUrl(firstNonEmpty(scraped?.ogImage?.[0]?.url, scraped?.twitterImage?.[0]?.url), pageUrl),
    siteName: firstNonEmpty(scraped?.ogSiteName) ?? hostname,
    favicon: resolveFavicon(scraped?.favicon, pageUrl),
  };
}
