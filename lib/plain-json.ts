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
 * carrying a colour arrived as `{"type":"textStyle"}` with the colour gone —
 * no error anywhere, on either side.
 *
 * A stringify/parse round trip is the fix precisely because it reconstructs every
 * nested object with a normal prototype. It also drops `undefined` values, which
 * is what JSON storage does anyway.
 */
export function toPlainJson<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}
