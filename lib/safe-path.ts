/** Control characters: a raw newline can split headers, NUL can truncate. */
function hasControlChars(value: string): boolean {
  for (let i = 0; i < value.length; i += 1) {
    const code = value.charCodeAt(i);
    if (code < 32 || code === 127) return true;
  }
  return false;
}

/**
 * A post-sign-in redirect target is attacker-controllable (`?callbackURL=...`
 * in a link anyone can send), so it must be proven to be a path on this app and
 * never used raw. Anything absolute, protocol-relative, or otherwise not a
 * plain in-app path falls back instead of redirecting off-site.
 */
export function safeInternalPath(value: string | null | undefined, fallback: string): string {
  if (!value) return fallback;

  const trimmed = value.trim();
  // Must be rooted. "//host" is a protocol-relative URL that browsers happily
  // send to another origin, and a backslash gets normalised to "/" by some
  // clients, so any backslash is treated as unsafe.
  if (!trimmed.startsWith("/")) return fallback;
  if (trimmed.startsWith("//")) return fallback;
  if (trimmed.includes("\\")) return fallback;
  if (hasControlChars(trimmed)) return fallback;

  return trimmed;
}
