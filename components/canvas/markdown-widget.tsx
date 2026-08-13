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
import {
  Bold,
  Italic,
  Strikethrough,
  List,
  ListOrdered,
  ListChecks,
  Heading1,
  Heading2,
  Trash2,
} from "lucide-react";
import { useEffect, useRef } from "react";
import { FontSize } from "@/lib/tiptap/font-size";
import { useWidgetChrome } from "@/components/canvas/widget-chrome-context";
import { useCanvasActions } from "@/components/canvas/canvas-actions-context";

const TEXT_COLORS = ["#e8eaed", "#8ab4f8", "#81c995", "#fdd663", "#f28b82", "#c58af9"];
const BG_COLORS = [
  { label: "None", value: null },
  { value: "rgba(138,180,248,0.25)" },
  { value: "rgba(129,201,149,0.25)" },
  { value: "rgba(253,214,99,0.25)" },
  { value: "rgba(242,139,130,0.25)" },
  { value: "rgba(197,138,249,0.25)" },
] as { label?: string; value: string | null }[];

const FONT_SIZES = [
  { label: "S", value: "12px" },
  { label: "M", value: "14px" },
  { label: "L", value: "18px" },
  { label: "XL", value: "24px" },
];

const SAVE_DEBOUNCE_MS = 600;

interface MarkdownWidgetProps {
  id: string;
  initialContent?: Record<string, unknown>;
  canWrite: boolean;
}

export function MarkdownWidget({ id, initialContent, canWrite }: MarkdownWidgetProps) {
  const { entered } = useWidgetChrome();
  const { updateWidgetData, deleteWidget } = useCanvasActions();
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

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
    content: initialContent ?? "",
    editable: entered && canWrite,
    immediatelyRender: false,
    editorProps: {
      attributes: { spellcheck: "false" },
    },
    onUpdate: ({ editor }) => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => {
        updateWidgetData(id, editor.getJSON());
      }, SAVE_DEBOUNCE_MS);
    },
  });

  useEffect(() => {
    editor?.setEditable(entered && canWrite);
  }, [editor, entered, canWrite]);

  if (!editor) return null;

  return (
    <div className="flex h-full flex-col">
      {entered && canWrite && (
        <div className="flex shrink-0 flex-wrap items-center gap-1 border-b border-white/[0.06] px-2 py-1.5">
          <ToolbarButton onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive("bold")}>
            <Bold className="h-3.5 w-3.5" />
          </ToolbarButton>
          <ToolbarButton onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive("italic")}>
            <Italic className="h-3.5 w-3.5" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleStrike().run()}
            active={editor.isActive("strike")}
          >
            <Strikethrough className="h-3.5 w-3.5" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
            active={editor.isActive("heading", { level: 1 })}
          >
            <Heading1 className="h-3.5 w-3.5" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            active={editor.isActive("heading", { level: 2 })}
          >
            <Heading2 className="h-3.5 w-3.5" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            active={editor.isActive("bulletList")}
          >
            <List className="h-3.5 w-3.5" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            active={editor.isActive("orderedList")}
          >
            <ListOrdered className="h-3.5 w-3.5" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleTaskList().run()}
            active={editor.isActive("taskList")}
          >
            <ListChecks className="h-3.5 w-3.5" />
          </ToolbarButton>

          <div className="mx-0.5 h-4 w-px bg-white/[0.08]" />

          <div className="flex items-center gap-0.5">
            {TEXT_COLORS.map((color) => (
              <button
                key={color}
                type="button"
                title="Text color"
                onClick={() => editor.chain().focus().setColor(color).run()}
                className="h-4 w-4 shrink-0 rounded-full ring-1 ring-white/10 cursor-pointer"
                style={{ backgroundColor: color }}
              />
            ))}
          </div>

          <div className="mx-0.5 h-4 w-px bg-white/[0.08]" />

          <div className="flex items-center gap-0.5">
            {BG_COLORS.map((bg, i) => (
              <button
                key={i}
                type="button"
                title={bg.label ?? "Highlight"}
                onClick={() =>
                  bg.value
                    ? editor.chain().focus().setHighlight({ color: bg.value }).run()
                    : editor.chain().focus().unsetHighlight().run()
                }
                className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full ring-1 ring-white/10 cursor-pointer"
                style={{ backgroundColor: bg.value ?? "transparent" }}
              >
                {!bg.value && <span className="text-[8px] text-[#f28b82]">×</span>}
              </button>
            ))}
          </div>

          <div className="mx-0.5 h-4 w-px bg-white/[0.08]" />

          <div className="flex items-center gap-0.5">
            {FONT_SIZES.map((s) => (
              <button
                key={s.value}
                type="button"
                onClick={() => editor.chain().focus().setFontSize(s.value).run()}
                className="rounded-md px-1.5 py-0.5 text-[10.5px] font-medium text-[#9aa0a6] hover:bg-white/[0.06] hover:text-[#e8eaed] cursor-pointer"
              >
                {s.label}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => deleteWidget(id)}
            title="Delete note"
            className="ml-auto rounded-md p-1 text-[#9aa0a6] hover:bg-[#f28b82]/10 hover:text-[#f28b82] cursor-pointer"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      <div className="min-h-0 flex-1 overflow-y-auto scrollbar-thin px-3 py-2">
        <EditorContent editor={editor} className="prose-note h-full text-[13.5px] text-[#e8eaed]" />
      </div>
    </div>
  );
}

function ToolbarButton({
  onClick,
  active,
  children,
}: {
  onClick: () => void;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-md p-1.5 cursor-pointer ${
        active ? "bg-[#8ab4f8]/20 text-[#8ab4f8]" : "text-[#9aa0a6] hover:bg-white/[0.06] hover:text-[#e8eaed]"
      }`}
    >
      {children}
    </button>
  );
}
