import { Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";

// tiptap-markdown's shipped types only declare `getMarkdown()` on its
// storage, but the parser it actually attaches at runtime (used here) isn't
// in that .d.ts — augmenting rather than casting keeps this typed for real.
declare module "@tiptap/core" {
  interface Storage {
    markdown?: {
      parser: { parse: (content: string, options?: { inline?: boolean }) => string };
    };
  }
}

// tiptap-markdown's own clipboardTextParser only ever runs when the paste
// has NO text/html flavor — but copying markdown source from a browser tab,
// a chat window, or most editors puts an html flavor on the clipboard too
// (even if it's just the same text re-wrapped in a <p>/<span>), so
// ProseMirror's default paste logic always prefers that html and the
// markdown parser never gets a turn. This intercepts paste directly and
// forces markdown parsing whenever the plain-text payload looks like real
// markdown source, regardless of what html also came along with it —
// letting genuinely rich paste (e.g. a formatted selection from Docs/Notion
// that isn't markdown source) fall through to the normal html-aware path.
const MARKDOWN_SIGNAL = /^ {0,3}(#{1,6}\s|```|~~~|\|.*\|)\s*$|^ {0,3}\|[\s:-]+\|/m;

export const MarkdownPasteHandler = Extension.create({
  name: "markdownPasteHandler",

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey("markdownPasteHandler"),
        props: {
          handlePaste: (_view, event) => {
            const text = event.clipboardData?.getData("text/plain");
            if (!text || !MARKDOWN_SIGNAL.test(text)) return false;

            const markdown = this.editor.storage.markdown;
            if (!markdown) return false;

            const parsed = markdown.parser.parse(text);
            this.editor.commands.insertContent(parsed);
            return true;
          },
        },
      }),
    ];
  },
});
