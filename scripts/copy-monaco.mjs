import { cp, mkdir, rm, stat } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Copies Monaco's prebuilt AMD bundle into public/monaco so the editor is served
 * from this app instead of a CDN.
 *
 * Why a copy step rather than importing `monaco-editor` and bundling it: the ESM
 * build keeps its editor services in a module-level singleton that is disposed
 * with the last editor instance, so React's StrictMode double-mount tears them
 * down and the second mount dies with "InstantiationService has been disposed".
 * The AMD bundle loaded through @monaco-editor/react's loader keeps ONE global
 * Monaco for the page's lifetime, which survives remounts — and the loader wires
 * up the web workers from the same path with no extra configuration.
 *
 * public/monaco is generated, so it's gitignored and rebuilt by postinstall.
 */

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");
const source = join(root, "node_modules", "monaco-editor", "min", "vs");
const destination = join(root, "public", "monaco", "vs");

try {
  await stat(source);
} catch {
  // Not an error worth failing an install over — monaco-editor simply isn't
  // installed yet (or at all, on a machine that only runs the tests).
  console.log("[copy-monaco] monaco-editor not installed; skipping.");
  process.exit(0);
}

await rm(destination, { recursive: true, force: true });
await mkdir(dirname(destination), { recursive: true });
await cp(source, destination, { recursive: true });

console.log(`[copy-monaco] copied min/vs -> public/monaco/vs`);
