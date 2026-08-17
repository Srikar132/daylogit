import { Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { normalizeMarkdownSource, shouldParseAsMarkdown } from "@/lib/tiptap/markdown-signal";

/**
 * Parses pasted markdown source into real nodes.
 *
 * Parsing itself is entirely `@tiptap/markdown`'s job — this only decides
 * WHEN the clipboard's plain-text flavour should be treated as markdown source
 * (see `shouldParseAsMarkdown`), because the official extension has no paste
 * handling of its own: it parses only when a caller explicitly passes
 * `contentType: "markdown"`, and ProseMirror's default paste path never does.
 */
export const MarkdownPasteHandler = Extension.create({
  name: "markdownPasteHandler",

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey("markdownPasteHandler"),
        props: {
          handlePaste: (_view, event) => {
            const text = event.clipboardData?.getData("text/plain");
            const html = event.clipboardData?.getData("text/html");
            if (!shouldParseAsMarkdown(text, html)) return false;

            return this.editor.commands.insertContent(normalizeMarkdownSource(text as string), {
              contentType: "markdown",
            });
          },
        },
      }),
    ];
  },
});
