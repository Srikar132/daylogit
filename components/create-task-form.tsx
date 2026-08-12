"use client";

import { CalendarDays, ChevronDown, CornerDownLeft, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { WORK_TYPES, type WorkType } from "@/lib/constants";
import { WorkTypeIcon } from "@/components/work-type-icon";
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
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1 rounded-md p-1 hover:bg-white/[0.06] cursor-pointer"
        title="Work type"
      >
        <WorkTypeIcon type={value} className="h-4 w-4" />
        <ChevronDown className="h-3 w-3 text-[#80868b]" />
      </button>

      {open && (
        <div className="absolute bottom-[calc(100%+6px)] left-0 z-10 w-36 overflow-hidden rounded-xl border border-white/[0.08] bg-[#1e1e1e] py-1 shadow-2xl">
          {WORK_TYPES.map((t) => (
            <button
              key={t.value}
              type="button"
              onClick={() => {
                onChange(t.value);
                setOpen(false);
              }}
              className={`flex w-full items-center gap-2 px-2.5 py-1.5 text-left text-[13px] cursor-pointer ${
                t.value === value ? "bg-[#1b6ef3]/25 text-[#8ab4f8]" : "text-[#e8eaed] hover:bg-white/[0.06]"
              }`}
            >
              <WorkTypeIcon type={t.value} className="h-4 w-4" />
              {t.label}
            </button>
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
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`flex items-center gap-1 rounded-md p-1 hover:bg-white/[0.06] cursor-pointer ${
          value ? "text-[#8ab4f8]" : "text-[#80868b]"
        }`}
        title="Due date"
      >
        <CalendarDays className="h-4 w-4" />
      </button>

      {open && (
        <div className="absolute bottom-[calc(100%+6px)] left-0 z-10 rounded-xl border border-white/[0.08] bg-[#1e1e1e] p-2 shadow-2xl">
          <input
            type="date"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            autoFocus
            className="rounded-md bg-white/[0.06] px-2 py-1 text-[12.5px] text-[#e8eaed] focus:outline-none"
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
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || isSubmitting) return;

    setIsSubmitting(true);
    setError(null);
    try {
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
      if (res.ok) {
        onCreated();
      } else {
        const body = await res.json().catch(() => null);
        setError(body?.error ?? "Couldn't create this task.");
      }
    } catch (err) {
      console.error("Failed to create entry", err);
      setError("Couldn't create this task.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={handleCreate}
      onKeyDown={(e) => {
        if (e.key === "Escape") onCancel();
      }}
      className="flex flex-col gap-2 rounded-xl border-2 border-[#8ab4f8] bg-[#1e1e1e] p-3 shadow-2xl"
    >
      <div className="flex items-start gap-2">
        <textarea
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="What needs to be done?"
          rows={2}
          autoFocus
          disabled={isSubmitting}
          className="w-full resize-none bg-transparent text-[14px] text-[#e8eaed] placeholder:text-[#80868b] focus:outline-none"
        />
        <button
          type="button"
          onClick={onCancel}
          className="shrink-0 rounded-md p-1 text-[#80868b] hover:bg-white/[0.06] hover:text-[#e8eaed] cursor-pointer"
          title="Cancel"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      {error && <p className="text-[11.5px] text-[#f28b82]">{error}</p>}

      <div className="flex items-center gap-1">
        <WorkTypePicker value={workType} onChange={setWorkType} />
        <DueDatePicker value={dueDate} onChange={setDueDate} />

        <button
          type="submit"
          disabled={!title.trim() || isSubmitting}
          title="Create (Enter)"
          className={`ml-auto flex h-7 w-7 items-center justify-center rounded-lg transition-colors ${
            title.trim() && !isSubmitting
              ? "bg-[#8ab4f8] text-[#141414] cursor-pointer"
              : "bg-white/[0.06] text-[#5f6368]"
          }`}
        >
          <CornerDownLeft className="h-3.5 w-3.5" />
        </button>
      </div>
    </form>
  );
}
