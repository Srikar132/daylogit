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
import { useCallback, useEffect, useRef, useState } from "react";
import { FontSize } from "@/lib/tiptap/font-size";
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
function isWrappedData(data: Record<string, unknown>): data is { content?: Record<string, unknown>; bgColor?: string } {
  return data.type !== "doc";
}

export function MarkdownWidget({ id, initialContent, canWrite }: MarkdownWidgetProps) {
  const { entered, setFloatingToolbar } = useWidgetChrome();
  const { updateWidgetData, deleteWidget } = useCanvasActions();
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Bumped on every editor transaction so bold/italic/etc. active-state
  // highlighting in the toolbar follows the live cursor.
  const [, forceRender] = useState(0);

  const wrapped = initialContent && isWrappedData(initialContent) ? initialContent : undefined;
  const initialDoc = wrapped ? wrapped.content : initialContent;
  const [bgColor, setBgColor] = useState<string | undefined>(wrapped?.bgColor);

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
    ],
    content: initialDoc ?? "",
    editable: entered && canWrite,
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
    // Second arg suppresses setEditable's own "update" event — without it,
    // just entering/exiting the note (which flips editable) fires onUpdate
    // and queues a save even though nothing was actually typed.
    editor?.setEditable(entered && canWrite, false);
  }, [editor, entered, canWrite]);

  useEffect(() => {
    if (!entered || !editor) {
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
  }, [entered, editor, id, bgColor, deleteWidget, handleBgColorChange, setFloatingToolbar]);

  if (!editor) return null;

  return (
    <div
      className={`h-full min-h-0 flex-1 overflow-y-auto scrollbar-thin px-3 py-2 ${
        // Only nodrag+nowheel once entered — un-entered, this needs to stay
        // a normal (non-exempted) surface so grabbing it drags the whole
        // chromeless node, same as media. Once entered, scrolling/selecting
        // text shouldn't be hijacked by the canvas's own pan/zoom.
        entered ? "nodrag nowheel cursor-text" : "cursor-grab"
      }`}
    >
      <EditorContent editor={editor} className="prose-note h-full text-[13.5px] text-[#e8eaed]" />
    </div>
  );
}
