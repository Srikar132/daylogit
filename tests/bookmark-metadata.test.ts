import { describe, expect, it } from "vitest";
import { absoluteUrl, resolveBookmarkPreview, resolveFavicon } from "@/lib/bookmark-metadata";

const PAGE = "https://example.com/blog/post?ref=1";

describe("absoluteUrl", () => {
  // The reported bug: a relative icon stored as-is resolves against whatever
  // origin renders it, so every such bookmark showed OUR favicon.
  it("resolves a root-relative path against the page's origin, not ours", () => {
    expect(absoluteUrl("/favicon.ico", PAGE)).toBe("https://example.com/favicon.ico");
  });

  it("resolves a path-relative reference against the page's directory", () => {
    expect(absoluteUrl("icon.png", PAGE)).toBe("https://example.com/blog/icon.png");
  });

  it("resolves a protocol-relative url using the page's scheme", () => {
    expect(absoluteUrl("//cdn.example.com/i.png", PAGE)).toBe("https://cdn.example.com/i.png");
  });

  it("leaves an absolute url alone", () => {
    expect(absoluteUrl("https://cdn.other.com/i.png", PAGE)).toBe("https://cdn.other.com/i.png");
  });

  it("drops schemes that don't belong in an img src", () => {
    // Both parse as valid URLs, so only an explicit protocol check stops them.
    expect(absoluteUrl("javascript:alert(1)", PAGE)).toBeUndefined();
    expect(absoluteUrl("data:image/svg+xml,<svg/>", PAGE)).toBeUndefined();
  });

  it("returns undefined for empty or missing values", () => {
    expect(absoluteUrl(undefined, PAGE)).toBeUndefined();
    expect(absoluteUrl("", PAGE)).toBeUndefined();
    expect(absoluteUrl("   ", PAGE)).toBeUndefined();
  });
});

describe("resolveFavicon", () => {
  it("uses the page's declared icon, made absolute", () => {
    expect(resolveFavicon("/assets/icon.png", PAGE)).toBe("https://example.com/assets/icon.png");
  });

  it("falls back to the /favicon.ico convention when none is declared", () => {
    // Nearly every site has one, which is why the card leans on the icon rather
    // than an OG image most links don't have.
    expect(resolveFavicon(undefined, PAGE)).toBe("https://example.com/favicon.ico");
  });

  it("falls back when the declared icon is unusable", () => {
    expect(resolveFavicon("javascript:alert(1)", PAGE)).toBe("https://example.com/favicon.ico");
  });
});

describe("resolveBookmarkPreview", () => {
  it("prefers open graph, then twitter card", () => {
    const preview = resolveBookmarkPreview(PAGE, {
      ogTitle: "OG title",
      twitterTitle: "Twitter title",
      ogDescription: "OG description",
    });
    expect(preview.title).toBe("OG title");
    expect(preview.description).toBe("OG description");
  });

  it("uses the twitter card when open graph is absent", () => {
    const preview = resolveBookmarkPreview(PAGE, {
      twitterTitle: "Twitter title",
      twitterDescription: "Twitter description",
      twitterImage: [{ url: "/tw.png" }],
    });
    expect(preview.title).toBe("Twitter title");
    expect(preview.description).toBe("Twitter description");
    expect(preview.image).toBe("https://example.com/tw.png");
  });

  it("still yields a usable bookmark for a page with no metadata at all", () => {
    const preview = resolveBookmarkPreview(PAGE, null);
    expect(preview).toMatchObject({
      url: PAGE,
      title: "example.com",
      siteName: "example.com",
      favicon: "https://example.com/favicon.ico",
    });
    expect(preview.image).toBeUndefined();
    expect(preview.description).toBeUndefined();
  });

  it("strips a www prefix from the hostname fallback", () => {
    expect(resolveBookmarkPreview("https://www.example.com/x", null).title).toBe("example.com");
  });

  it("treats whitespace-only metadata as missing", () => {
    const preview = resolveBookmarkPreview(PAGE, { ogTitle: "   ", ogDescription: "  " });
    expect(preview.title).toBe("example.com");
    expect(preview.description).toBeUndefined();
  });

  it("resolves a relative og image", () => {
    const preview = resolveBookmarkPreview(PAGE, { ogImage: [{ url: "/og/hero.png" }] });
    expect(preview.image).toBe("https://example.com/og/hero.png");
  });

  it("drops an og image with an unusable scheme instead of rendering it", () => {
    expect(resolveBookmarkPreview(PAGE, { ogImage: [{ url: "javascript:alert(1)" }] }).image).toBeUndefined();
  });

  it("keeps the url it was given", () => {
    expect(resolveBookmarkPreview(PAGE, { ogTitle: "x" }).url).toBe(PAGE);
  });
});
