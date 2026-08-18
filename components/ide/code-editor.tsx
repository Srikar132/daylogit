"use client";

import Editor, { loader } from "@monaco-editor/react";
import { findLanguage, type CodeLanguageId } from "@/lib/code-runner/languages";

/**
 * Monaco, served from this app rather than a CDN.
 *
 * `@monaco-editor/react` fetches Monaco from jsDelivr by default; pointing the
 * loader at our own copy (see scripts/copy-monaco.mjs, which populates
 * public/monaco on install) means the editor works offline, survives a CDN
 * outage, and needs no script-src exception.
 *
 * It deliberately does NOT hand the loader a bundled `monaco-editor` import.
 * Monaco's ESM build keeps its editor services in a module-level singleton that
 * is disposed along with the last editor instance, so React's StrictMode
 * double-mount disposes them on the first unmount and the second mount fails with
 * "InstantiationService has been disposed". The AMD bundle the loader fetches
 * keeps one global Monaco for the lifetime of the page, which remounts freely —
 * and the loader configures the web workers from the same path on its own.
 */
loader.config({ paths: { vs: "/monaco/vs" } });

interface CodeEditorProps {
  languageId: CodeLanguageId;
  value: string;
  readOnly: boolean;
  onChange: (value: string) => void;
}

export function CodeEditor({ languageId, value, readOnly, onChange }: CodeEditorProps) {
  return (
    <Editor
      language={findLanguage(languageId)?.monaco ?? "plaintext"}
      theme="vs-dark"
      value={value}
      onChange={(next) => onChange(next ?? "")}
      loading={<span className="text-[12.5px] text-muted-foreground">Loading editor…</span>}
      options={{
        readOnly,
        fontSize: 13.5,
        fontFamily: "var(--font-geist-mono), ui-monospace, monospace",
        minimap: { enabled: false },
        scrollBeyondLastLine: false,
        automaticLayout: true,
        tabSize: 4,
        renderWhitespace: "selection",
        smoothScrolling: true,
        padding: { top: 12, bottom: 12 },
      }}
    />
  );
}
