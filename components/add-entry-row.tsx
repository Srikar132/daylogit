"use client";

import { Plus } from "lucide-react";
import { useState } from "react";
import { EntryForm } from "@/components/entry-form";

export function AddEntryRow() {
  const [isOpen, setIsOpen] = useState(false);

  if (isOpen) {
    return (
      <EntryForm
        onDone={() => setIsOpen(false)}
        onCancel={() => setIsOpen(false)}
      />
    );
  }

  return (
    <button
      type="button"
      onClick={() => setIsOpen(true)}
      className="text-primary flex w-full items-center gap-2 py-2 text-sm font-medium hover:opacity-80"
    >
      <Plus className="size-4" />
      Add entry
    </button>
  );
}
