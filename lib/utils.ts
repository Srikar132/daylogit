import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Rebuilds a value as plain JSON before it crosses a server-action boundary.
 *
 * Server action arguments are serialized by React Flight, which only handles
 * plain objects — ones whose prototype is `Object.prototype`. ProseMirror builds
 * a mark's `attrs` with `Object.create(null)`, so `editor.getJSON()` contains
 * null-prototype objects. Flight can't reconstruct those, so instead of failing
 * it passes an opaque "temporary client reference", and the value serializes to
 * nothing when the action writes it. The result was silent and very specific:
 * marks with no attributes (bold, italic) saved fine, while a `textStyle` mark
 * carrying a colour arrived as `{"type":"textStyle"}` with the colour gone.
 *
 * A stringify/parse round trip is the fix precisely because it reconstructs every
 * nested object with a normal prototype. It also drops `undefined`, which is what
 * JSON storage does anyway.
 */
export function toPlainJson<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

/** Control characters: a raw newline can split headers, NUL can truncate. */
function hasControlChars(value: string): boolean {
  for (let i = 0; i < value.length; i += 1) {
    const code = value.charCodeAt(i);
    if (code < 32 || code === 127) return true;
  }
  return false;
}

/**
 * A post-sign-in redirect target is attacker-controllable (`?callbackURL=...` in
 * a link anyone can send), so it must be proven to be a path on this app and
 * never used raw. Anything absolute, protocol-relative, or otherwise not a plain
 * in-app path falls back instead of redirecting off-site.
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

/**
 * Escapes a user-typed string for use inside a SQL `LIKE`/`ILIKE` pattern.
 *
 * `%` and `_` are wildcards, so typing them would otherwise change what the
 * query matches — a lone `%` would match every row. The backslash goes first, or
 * it would escape the escapes added after it.
 */
export function escapeLikePattern(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/%/g, "\\%").replace(/_/g, "\\_");
}

/** A `contains` pattern for ILIKE, with the user's own wildcards neutralised. */
export function containsPattern(value: string): string {
  return `%${escapeLikePattern(value.trim())}%`;
}
