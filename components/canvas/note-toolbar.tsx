"use client";

import type { Editor } from "@tiptap/react";
import {
  Bold,
  Code2,
  Heading1,
  Heading2,
  Italic,
  List,
  ListChecks,
  ListOrdered,
  Quote,
  Strikethrough,
  Trash2,
  Underline as UnderlineIcon,
} from "lucide-react";


const TEXT_COLORS = [
  { label: "White", value: "#F8FAFC" },
  { label: "Blue", value: "#7DD3FC" },
  { label: "Green", value: "#86EFAC" },
  { label: "Yellow", value: "#FDE047" },
  { label: "Rose", value: "#FDA4AF" },
  { label: "Purple", value: "#D8B4FE" },
];

const BG_COLORS = [
  { label: "None", value: null },
  { value: "rgba(59, 130, 246, 0.45)" },
  { value: "rgba(16, 185, 129, 0.45)" },
  { value: "rgba(245, 158, 11, 0.45)" },
  { value: "rgba(244, 63, 94, 0.45)" },
  { value: "rgba(139, 92, 246, 0.45)" },
];

const CARD_COLORS = [
  { label: "Default", value: undefined },
  { value: "#2563EB" },
  { value: "#10B981" },
  { value: "#F59E0B" },
  { value: "#8B5CF6" },
  { value: "#F43F5E" },
];

const FONT_SIZES = [
  { label: "S", value: "12px" },
  { label: "M", value: "14px" },
  { label: "L", value: "18px" },
  { label: "XL", value: "24px" },
];

interface NoteToolbarProps {
  editor: Editor;
  bgColor: string | undefined;
  onBgColorChange: (color: string | undefined) => void;
  onDelete: () => void;
}

/** Rendered by WidgetNode just above this note's own card, outside its
 *  clip — one instance per note, mirroring docs/global-toolbar.tsx's
 *  button set and active-state highlighting. */
export function NoteToolbar({ editor, bgColor, onBgColorChange, onDelete }: NoteToolbarProps) {
  return (
    <div className="pointer-events-auto flex max-w-[calc(100vw-2rem)] flex-wrap items-center gap-1 rounded-2xl border border-white/[0.08] bg-[#131314]/95 px-3 py-1.5 shadow-2xl backdrop-blur-md">
      <ToolbarButton onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive("bold")}>
        <Bold className="h-3.5 w-3.5" />
      </ToolbarButton>
      <ToolbarButton onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive("italic")}>
        <Italic className="h-3.5 w-3.5" />
      </ToolbarButton>
      <ToolbarButton onClick={() => editor.chain().focus().toggleStrike().run()} active={editor.isActive("strike")}>
        <Strikethrough className="h-3.5 w-3.5" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleUnderline().run()}
        active={editor.isActive("underline")}
      >
        <UnderlineIcon className="h-3.5 w-3.5" />
      </ToolbarButton>
      <ToolbarButton onClick={() => editor.chain().focus().toggleCode().run()} active={editor.isActive("code")}>
        <Code2 className="h-3.5 w-3.5" />
      </ToolbarButton>

      <div className="mx-0.5 h-4 w-px bg-white/[0.08]" />

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
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
        active={editor.isActive("blockquote")}
      >
        <Quote className="h-3.5 w-3.5" />
      </ToolbarButton>

      <div className="mx-0.5 h-4 w-px bg-white/[0.08]" />

      <div className="flex items-center gap-0.5">
        {TEXT_COLORS.map((color) => (
          <button
            key={color.value}
            type="button"
            title={color.label}
            onClick={() => editor.chain().focus().setColor(color.value).run()}
            className="h-4 w-4 shrink-0 rounded-full ring-1 ring-white/10 cursor-pointer"
            style={{ backgroundColor: color.value }}
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
            {!bg.value && <span className="text-[8px] text-destructive">×</span>}
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
            className="rounded-md px-1.5 py-0.5 text-[10.5px] font-medium text-muted-foreground hover:bg-white/[0.06] hover:text-foreground cursor-pointer"
          >
            {s.label}
          </button>
        ))}
      </div>

      <div className="mx-0.5 h-4 w-px bg-white/[0.08]" />

      <div className="flex items-center gap-0.5">
        {CARD_COLORS.map((c, i) => (
          <button
            key={i}
            type="button"
            title={c.label ?? "Card background"}
            onClick={() => onBgColorChange(c.value)}
            className={`h-4 w-4 shrink-0 rounded-full ring-1 cursor-pointer ${bgColor === c.value ? "ring-2 ring-white/60" : "ring-white/10"
              }`}
            style={{ backgroundColor: c.value ?? "#131314" }}
          />
        ))}
      </div>

      <div className="mx-0.5 h-4 w-px bg-white/[0.08]" />

      <button
        type="button"
        onClick={onDelete}
        title="Delete note"
        className="rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive cursor-pointer"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
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
      className={`rounded-md p-1.5 cursor-pointer ${active ? "bg-white/15 text-white" : "text-[#9aa0a6] hover:bg-white/[0.06] hover:text-[#e8eaed]"
        }`}
    >
      {children}
    </button>
  );
}
