"use client";

import { useMutation } from "@tanstack/react-query";
import { CalendarDays, ChevronDown, CornerDownLeft, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { WORK_TYPES, type WorkType } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { WorkTypeIcon } from "@/components/board/work-type-icon";
import type { TaskStatus } from "@/lib/db";

interface CreateTaskFormProps {
  status: TaskStatus;
  onCreated: () => void;
  onCancel: () => void;
}

function useClickOutside(onOutside: () => void) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onOutside();
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onOutside]);
  return ref;
}

function WorkTypePicker({ value, onChange }: { value: WorkType; onChange: (v: WorkType) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useClickOutside(() => setOpen(false));

  return (
    <div ref={ref} className="relative">
      <Button
        type="button"
        variant="ghost"
        onClick={() => setOpen((v) => !v)}
        className="h-auto gap-1 p-1"
        title="Work type"
      >
        <WorkTypeIcon type={value} className="h-4 w-4" />
        <ChevronDown className="h-3 w-3 text-muted-foreground" />
      </Button>

      {open && (
        <div className="absolute bottom-[calc(100%+6px)] left-0 z-10 w-36 overflow-hidden rounded-xl border border-white/[0.08] bg-popover py-1 shadow-2xl">
          {WORK_TYPES.map((t) => (
            <Button
              key={t.value}
              type="button"
              variant="ghost"
              onClick={() => {
                onChange(t.value);
                setOpen(false);
              }}
              className={`h-auto w-full justify-start gap-2 rounded-none px-2.5 py-1.5 text-[13px] font-normal ${
                t.value === value ? "bg-primary/25 text-primary" : "text-foreground"
              }`}
            >
              <WorkTypeIcon type={t.value} className="h-4 w-4" />
              {t.label}
            </Button>
          ))}
        </div>
      )}
    </div>
  );
}

function DueDatePicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useClickOutside(() => setOpen(false));

  return (
    <div ref={ref} className="relative">
      <Button
        type="button"
        variant="ghost"
        onClick={() => setOpen((v) => !v)}
        className={`h-auto w-auto p-1 ${value ? "text-primary" : "text-muted-foreground"}`}
        title="Due date"
      >
        <CalendarDays className="h-4 w-4" />
      </Button>

      {open && (
        <div className="absolute bottom-[calc(100%+6px)] left-0 z-10 rounded-xl border border-white/[0.08] bg-popover p-2 shadow-2xl">
          <input
            type="date"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            autoFocus
            className="rounded-md bg-white/[0.06] px-2 py-1 text-[12.5px] text-foreground focus:outline-none"
          />
        </div>
      )}
    </div>
  );
}

export function CreateTaskForm({ status, onCreated, onCancel }: CreateTaskFormProps) {
  const [title, setTitle] = useState("");
  const [workType, setWorkType] = useState<WorkType>("task");
  const [dueDate, setDueDate] = useState("");
  const [error, setError] = useState<string | null>(null);

  const createMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/entries/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          summary: title.trim(),
          status,
          workType,
          dueDate: dueDate || undefined,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? "Couldn't create this task.");
      }
    },
    onSuccess: onCreated,
    onError: (err) => setError(err.message),
  });

  function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || createMutation.isPending) return;
    setError(null);
    createMutation.mutate();
  }

  return (
    <form
      onSubmit={handleCreate}
      onKeyDown={(e) => {
        if (e.key === "Escape") onCancel();
      }}
      // `nodrag nowheel` — this form has real text inputs (title, due date)
      // a user will click-drag to select text in; without it, that drag
      // gesture gets captured by xyflow's canvas instead.
      className="nodrag nowheel flex flex-col gap-2 rounded-xl border-2 border-primary bg-popover p-3 shadow-2xl"
    >
      <div className="flex items-start gap-2">
        <textarea
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="What needs to be done?"
          rows={2}
          autoFocus
          disabled={createMutation.isPending}
          className="w-full resize-none bg-transparent text-[14px] text-foreground placeholder:text-muted-foreground focus:outline-none"
        />
        <Button
          type="button"
          variant="ghost"
          onClick={onCancel}
          className="h-auto w-auto shrink-0 p-1 text-muted-foreground hover:text-foreground"
          title="Cancel"
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>

      {error && <p className="text-[11.5px] text-destructive">{error}</p>}

      <div className="flex items-center gap-1">
        <WorkTypePicker value={workType} onChange={setWorkType} />
        <DueDatePicker value={dueDate} onChange={setDueDate} />

        <Button
          type="submit"
          size="icon-sm"
          disabled={!title.trim() || createMutation.isPending}
          title="Create (Enter)"
          className="ml-auto rounded-lg"
        >
          <CornerDownLeft className="h-3.5 w-3.5" />
        </Button>
      </div>
    </form>
  );
}
