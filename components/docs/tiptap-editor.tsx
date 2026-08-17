"use client";

import { useEditor, EditorContent, type Editor, type JSONContent } from "@tiptap/react";
import { StarterKit } from "@tiptap/starter-kit";
import { TextStyle } from "@tiptap/extension-text-style";
import { Color } from "@tiptap/extension-color";
import { Highlight } from "@tiptap/extension-highlight";
import { Placeholder } from "@tiptap/extension-placeholder";
import { Table } from "@tiptap/extension-table";
import { TableRow } from "@tiptap/extension-table-row";
import { TableHeader } from "@tiptap/extension-table-header";
import { TableCell } from "@tiptap/extension-table-cell";
import { TaskList } from "@tiptap/extension-task-list";
import { TaskItem } from "@tiptap/extension-task-item";
import { Markdown } from "@tiptap/markdown";
import { useEffect, useRef } from "react";
import { FontSize } from "@/lib/tiptap/font-size";
import { MarkdownPasteHandler } from "@/lib/tiptap/markdown-paste";

const SAVE_DEBOUNCE_MS = 600;

interface TiptapEditorProps {
  content?: Record<string, unknown> | null;
  onChange?: (json: JSONContent) => void;
  editable: boolean;
  placeholder?: string;
  /** Applied to the EditorContent wrapper — lets each caller (canvas note vs
   *  docs page sheet) own its own typography/width without this component
   *  needing to know which context it's in. */
  className?: string;
  /** Fires when this editor gains focus — the docs route uses this to know
   *  which page's editor the single global toolbar should act on. */
  onFocusEditor?: (editor: Editor) => void;
}

/** Presentational Tiptap setup shared by the canvas markdown widget's spirit
 *  and the docs route's page editor — no canvas-specific context deps
 *  (unlike components/canvas/markdown-widget.tsx, which stays as-is and
 *  reads useWidgetChrome/useCanvasActions directly), and no toolbar of its
 *  own — the docs route renders one global toolbar instead of one per page.
 *  Content scrolls continuously — pagination only happens at export/print
 *  time via the browser's own print engine, not while editing (an earlier
 *  version tried to auto-paginate live and it was never reliable — see
 *  git history if curious). */
export function TiptapEditor({ content, onChange, editable, placeholder, className, onFocusEditor }: TiptapEditorProps) {
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const editor = useEditor({
    extensions: [
      StarterKit,
      TextStyle,
      Color,
      Highlight.configure({ multicolor: true }),
      FontSize,
      Placeholder.configure({ placeholder: placeholder ?? "Write something…" }),
      Table.configure({ resizable: true }),
      TableRow,
      TableHeader,
      TableCell,
      TaskList,
      TaskItem.configure({ nested: true }),
      Markdown.configure({ markedOptions: { gfm: true, breaks: true } }),
      // The extension above parses only for explicit contentType: "markdown"
      // callers, never on paste — this supplies the paste path.
      MarkdownPasteHandler,
    ],
    content: content ?? "",
    editable,
    immediatelyRender: false,
    editorProps: {
      attributes: { spellcheck: "false" },
    },
    onFocus: ({ editor }) => onFocusEditor?.(editor),
    onUpdate: ({ editor }) => {
      if (onChange) {
        if (saveTimer.current) clearTimeout(saveTimer.current);
        saveTimer.current = setTimeout(() => {
          onChange(editor.getJSON());
        }, SAVE_DEBOUNCE_MS);
      }
    },
  });

  useEffect(() => {
    editor?.setEditable(editable);
  }, [editor, editable]);

  if (!editor) return null;

  return <EditorContent editor={editor} className={className ?? "prose-note h-full"} />;
}
