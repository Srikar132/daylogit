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

const CARD_COLORS = [
  { label: "Default", value: undefined },
  { value: "#1a2332" },
  { value: "#1a2e22" },
  { value: "#2e2318" },
  { value: "#241a2e" },
  { value: "#2e1a1a" },
] as { label?: string; value: string | undefined }[];

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

      <div className="mx-0.5 h-4 w-px bg-white/[0.08]" />

      <div className="flex items-center gap-0.5">
        {CARD_COLORS.map((c, i) => (
          <button
            key={i}
            type="button"
            title={c.label ?? "Card background"}
            onClick={() => onBgColorChange(c.value)}
            className={`h-4 w-4 shrink-0 rounded-full ring-1 cursor-pointer ${
              bgColor === c.value ? "ring-2 ring-[#8ab4f8]" : "ring-white/10"
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
        className="rounded-md p-1.5 text-[#9aa0a6] hover:bg-[#f28b82]/10 hover:text-[#f28b82] cursor-pointer"
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
      className={`rounded-md p-1.5 cursor-pointer ${
        active ? "bg-[#8ab4f8]/20 text-[#8ab4f8]" : "text-[#9aa0a6] hover:bg-white/[0.06] hover:text-[#e8eaed]"
      }`}
    >
      {children}
    </button>
  );
}
