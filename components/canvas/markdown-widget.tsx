"use client";

import { useEditor, EditorContent } from "@tiptap/react";
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
import { useCallback, useEffect, useRef, useState } from "react";
import { FontSize } from "@/lib/tiptap/font-size";
import { MarkdownPasteHandler } from "@/lib/tiptap/markdown-paste";
import { normalizeMarkdownSource } from "@/lib/tiptap/markdown-signal";
import { useWidgetChrome } from "@/components/canvas/widget-chrome-context";
import { useCanvasActions } from "@/components/canvas/canvas-actions-context";
import { NoteToolbar } from "@/components/canvas/note-toolbar";

const SAVE_DEBOUNCE_MS = 600;

interface MarkdownWidgetProps {
  id: string;
  initialContent?: Record<string, unknown>;
  canWrite: boolean;
}

/** Chromeless — no header, no grip icon. While entered, pushes its own
 *  formatting toolbar up to WidgetNode via setFloatingToolbar, which renders
 *  it just above this card (outside its clip) — one toolbar per note. */
// Older notes stored the raw Tiptap doc directly as widgetData; notes saved
// after the card-background feature wrap it as { content, bgColor } instead
// — detect a raw doc by its "type": "doc" field to stay compatible with both.
function isWrappedData(
  data: Record<string, unknown>,
): data is { content?: Record<string, unknown>; bgColor?: string; pendingMarkdown?: string } {
  return data.type !== "doc";
}

export function MarkdownWidget({ id, initialContent, canWrite }: MarkdownWidgetProps) {
  const { editing, enterPoint, setFloatingToolbar } = useWidgetChrome();
  const { updateWidgetData, deleteWidget } = useCanvasActions();
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Bumped on every editor transaction so bold/italic/etc. active-state
  // highlighting in the toolbar follows the live cursor.
  const [, forceRender] = useState(0);

  const wrapped = initialContent && isWrappedData(initialContent) ? initialContent : undefined;
  const initialDoc = wrapped ? wrapped.content : initialContent;
  const [bgColor, setBgColor] = useState<string | undefined>(wrapped?.bgColor);
  // Set by a canvas paste (use-canvas-paste.ts) — raw markdown source that
  // only this editor can parse, since its extension set is what decides which
  // nodes (tables, task lists, ...) the markdown is allowed to produce.
  const pendingMarkdown = typeof wrapped?.pendingMarkdown === "string" ? wrapped.pendingMarkdown : undefined;
  const consumedPendingMarkdown = useRef(false);

  const editor = useEditor({
    extensions: [
      StarterKit,
      TextStyle,
      Color,
      Highlight.configure({ multicolor: true }),
      FontSize,
      Placeholder.configure({ placeholder: "Write something…" }),
      Table.configure({ resizable: true }),
      TableRow,
      TableHeader,
      TableCell,
      TaskList,
      TaskItem.configure({ nested: true }),
      // Markdown parse/serialize. Storage stays ProseMirror JSON — this only
      // matters when something explicitly passes contentType: "markdown".
      // breaks: a single newline is a hard break, not a paragraph
      // continuation, so pasted multi-line text keeps the lines as pasted.
      Markdown.configure({ markedOptions: { gfm: true, breaks: true } }),
      // The extension above never engages on paste by itself — it parses only
      // for explicit contentType: "markdown" callers. This supplies that.
      MarkdownPasteHandler,
    ],
    content: initialDoc ?? "",
    editable: editing && canWrite,
    immediatelyRender: false,
    editorProps: {
      attributes: { spellcheck: "false" },
    },
    onUpdate: ({ editor }) => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => {
        updateWidgetData(id, { content: editor.getJSON(), bgColor });
      }, SAVE_DEBOUNCE_MS);
    },
    onTransaction: () => forceRender((n) => n + 1),
  });

  const handleBgColorChange = useCallback(
    (color: string | undefined) => {
      setBgColor(color);
      if (editor) updateWidgetData(id, { content: editor.getJSON(), bgColor: color });
    },
    [editor, id, updateWidgetData],
  );

  useEffect(() => {
    if (!editor || !pendingMarkdown || consumedPendingMarkdown.current) return;
    consumedPendingMarkdown.current = true;
    editor.commands.setContent(normalizeMarkdownSource(pendingMarkdown), { contentType: "markdown" });
    updateWidgetData(id, { content: editor.getJSON(), bgColor });
  }, [editor, pendingMarkdown, id, bgColor, updateWidgetData]);

  useEffect(() => {
    // Second arg suppresses setEditable's own "update" event — without it,
    // just entering/exiting the note (which flips editable) fires onUpdate
    // and queues a save even though nothing was actually typed.
    editor?.setEditable(editing && canWrite, false);
  }, [editor, editing, canWrite]);

  // The double-click/tap that entered the note landed on a
  // `pointer-events-none` body, so ProseMirror never saw it and the caret
  // would otherwise sit at the start of the document no matter where the user
  // aimed. Replay that point as a real text position. Runs after the
  // setEditable effect above on purpose — focusing a non-editable view puts
  // the caret nowhere.
  useEffect(() => {
    if (!editor || !editing || !canWrite) return;
    const pos = enterPoint ? editor.view.posAtCoords({ left: enterPoint.x, top: enterPoint.y }) : null;
    editor.commands.focus(pos ? pos.pos : "end");
  }, [editor, editing, canWrite, enterPoint]);

  useEffect(() => {
    if (!editing || !editor) {
      setFloatingToolbar(null);
      return;
    }
    setFloatingToolbar(
      <NoteToolbar
        editor={editor}
        bgColor={bgColor}
        onBgColorChange={handleBgColorChange}
        onDelete={() => deleteWidget(id)}
      />,
    );
    return () => setFloatingToolbar(null);
  }, [editing, editor, id, bgColor, deleteWidget, handleBgColorChange, setFloatingToolbar]);

  if (!editor) return null;

  return (
    // nodrag/nowheel/cursor all come from the card shell's chrome (see
    // lib/canvas/widget-interaction.ts) — they apply to descendants, so
    // restating them here would just be a second copy of the same rules.
    <div className="h-full min-h-0 flex-1 overflow-y-auto scrollbar-thin px-3 py-2">
      <EditorContent editor={editor} className="prose-note h-full text-[13.5px] text-[#e8eaed]" />
    </div>
  );
}
