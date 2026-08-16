"use client";

import type { Editor } from "@tiptap/react";
import {
  Bold,
  Code2,
  Heading1,
  Heading2,
  Heading3,
  Italic,
  List,
  ListChecks,
  ListOrdered,
  Minus,
  Quote,
  Strikethrough,
  Underline as UnderlineIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const TEXT_COLORS = ["#1a1a1a", "#3b6fd4", "#2e8b57", "#b8860b", "#c0392b", "#8e44ad"];
const BG_COLORS = [
  { label: "None", value: null },
  { value: "rgba(59,111,212,0.18)" },
  { value: "rgba(46,139,87,0.18)" },
  { value: "rgba(184,134,11,0.18)" },
  { value: "rgba(192,57,43,0.18)" },
  { value: "rgba(142,68,173,0.18)" },
] as { label?: string; value: string | null }[];

const FONT_SIZES = [
  { label: "S", value: "12px" },
  { label: "M", value: "14px" },
  { label: "L", value: "18px" },
  { label: "XL", value: "24px" },
];

interface GlobalToolbarProps {
  /** Whichever page's editor last had focus — null before the user has
   *  clicked into any page yet, in which case every button is a no-op. */
  editor: Editor | null;
}

/** One toolbar for the whole docs route, not one per page — acts on
 *  whichever page's editor currently has focus. Re-renders on every
 *  transaction of that editor (docs-project-view subscribes and forces a
 *  re-render) so active-state highlighting (e.g. the Bold button lighting
 *  up) tracks the live cursor/selection, not just which editor is focused. */
export function GlobalToolbar({ editor }: GlobalToolbarProps) {
  const disabled = !editor;

  return (
    <div className="flex shrink-0 flex-wrap items-center gap-1 border-b border-white/[0.06] bg-card px-3 py-1.5 print:hidden">
      <ToolbarButton
        disabled={disabled}
        onClick={() => editor?.chain().focus().toggleBold().run()}
        active={editor?.isActive("bold") ?? false}
      >
        <Bold className="h-3.5 w-3.5" />
      </ToolbarButton>
      <ToolbarButton
        disabled={disabled}
        onClick={() => editor?.chain().focus().toggleItalic().run()}
        active={editor?.isActive("italic") ?? false}
      >
        <Italic className="h-3.5 w-3.5" />
      </ToolbarButton>
      <ToolbarButton
        disabled={disabled}
        onClick={() => editor?.chain().focus().toggleStrike().run()}
        active={editor?.isActive("strike") ?? false}
      >
        <Strikethrough className="h-3.5 w-3.5" />
      </ToolbarButton>
      <ToolbarButton
        disabled={disabled}
        onClick={() => editor?.chain().focus().toggleUnderline().run()}
        active={editor?.isActive("underline") ?? false}
      >
        <UnderlineIcon className="h-3.5 w-3.5" />
      </ToolbarButton>
      <ToolbarButton
        disabled={disabled}
        onClick={() => editor?.chain().focus().toggleCode().run()}
        active={editor?.isActive("code") ?? false}
      >
        <Code2 className="h-3.5 w-3.5" />
      </ToolbarButton>

      <div className="mx-0.5 h-4 w-px bg-white/[0.1]" />

      <ToolbarButton
        disabled={disabled}
        onClick={() => editor?.chain().focus().toggleHeading({ level: 1 }).run()}
        active={editor?.isActive("heading", { level: 1 }) ?? false}
      >
        <Heading1 className="h-3.5 w-3.5" />
      </ToolbarButton>
      <ToolbarButton
        disabled={disabled}
        onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}
        active={editor?.isActive("heading", { level: 2 }) ?? false}
      >
        <Heading2 className="h-3.5 w-3.5" />
      </ToolbarButton>
      <ToolbarButton
        disabled={disabled}
        onClick={() => editor?.chain().focus().toggleHeading({ level: 3 }).run()}
        active={editor?.isActive("heading", { level: 3 }) ?? false}
      >
        <Heading3 className="h-3.5 w-3.5" />
      </ToolbarButton>

      <div className="mx-0.5 h-4 w-px bg-white/[0.1]" />

      <ToolbarButton
        disabled={disabled}
        onClick={() => editor?.chain().focus().toggleBulletList().run()}
        active={editor?.isActive("bulletList") ?? false}
      >
        <List className="h-3.5 w-3.5" />
      </ToolbarButton>
      <ToolbarButton
        disabled={disabled}
        onClick={() => editor?.chain().focus().toggleOrderedList().run()}
        active={editor?.isActive("orderedList") ?? false}
      >
        <ListOrdered className="h-3.5 w-3.5" />
      </ToolbarButton>
      <ToolbarButton
        disabled={disabled}
        onClick={() => editor?.chain().focus().toggleTaskList().run()}
        active={editor?.isActive("taskList") ?? false}
      >
        <ListChecks className="h-3.5 w-3.5" />
      </ToolbarButton>
      <ToolbarButton
        disabled={disabled}
        onClick={() => editor?.chain().focus().toggleBlockquote().run()}
        active={editor?.isActive("blockquote") ?? false}
      >
        <Quote className="h-3.5 w-3.5" />
      </ToolbarButton>
      <ToolbarButton
        disabled={disabled}
        onClick={() => editor?.chain().focus().toggleCodeBlock().run()}
        active={editor?.isActive("codeBlock") ?? false}
      >
        <Code2 className="h-3.5 w-3.5" strokeWidth={2.5} />
      </ToolbarButton>
      <ToolbarButton
        disabled={disabled}
        onClick={() => editor?.chain().focus().setHorizontalRule().run()}
        active={false}
      >
        <Minus className="h-3.5 w-3.5" />
      </ToolbarButton>

      <div className="mx-0.5 h-4 w-px bg-white/[0.1]" />

      <div className="flex items-center gap-0.5">
        {TEXT_COLORS.map((color) => (
          <button
            key={color}
            type="button"
            title="Text color"
            disabled={disabled}
            onClick={() => editor?.chain().focus().setColor(color).run()}
            className="h-4 w-4 shrink-0 rounded-full ring-1 ring-white/10 cursor-pointer disabled:cursor-not-allowed disabled:opacity-40"
            style={{ backgroundColor: color }}
          />
        ))}
      </div>

      <div className="mx-0.5 h-4 w-px bg-white/[0.1]" />

      <div className="flex items-center gap-0.5">
        {BG_COLORS.map((bg, i) => (
          <button
            key={i}
            type="button"
            title={bg.label ?? "Highlight"}
            disabled={disabled}
            onClick={() =>
              bg.value
                ? editor?.chain().focus().setHighlight({ color: bg.value }).run()
                : editor?.chain().focus().unsetHighlight().run()
            }
            className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full ring-1 ring-white/10 cursor-pointer disabled:cursor-not-allowed disabled:opacity-40"
            style={{ backgroundColor: bg.value ?? "transparent" }}
          >
            {!bg.value && <span className="text-[8px] text-destructive">×</span>}
          </button>
        ))}
      </div>

      <div className="mx-0.5 h-4 w-px bg-white/[0.1]" />

      <div className="flex items-center gap-0.5">
        {FONT_SIZES.map((s) => (
          <Button
            key={s.value}
            type="button"
            variant="ghost"
            size="xs"
            disabled={disabled}
            onClick={() => editor?.chain().focus().setFontSize(s.value).run()}
            className="rounded-md px-1.5 py-0.5 text-[10.5px] font-medium text-muted-foreground hover:bg-white/[0.06] hover:text-foreground"
          >
            {s.label}
          </Button>
        ))}
      </div>
    </div>
  );
}

function ToolbarButton({
  onClick,
  active,
  disabled,
  children,
}: {
  onClick: () => void;
  active: boolean;
  disabled: boolean;
  children: React.ReactNode;
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      disabled={disabled}
      onClick={onClick}
      className={`rounded-md p-1.5 ${
        active ? "bg-primary/20 text-primary" : "text-muted-foreground hover:bg-white/[0.06] hover:text-foreground"
      }`}
    >
      {children}
    </Button>
  );
}
