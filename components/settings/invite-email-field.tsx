"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { suggestInviteEmailsAction } from "@/lib/actions/members";
import { unwrapAction } from "@/lib/query-utils";

const SUGGEST_DEBOUNCE_MS = 200;
/** Below this the suggestion list is more noise than help, and the action
 *  refuses to search anyway. */
const MIN_QUERY_LENGTH = 2;

interface InviteEmailFieldProps {
  value: string;
  onChange: (value: string) => void;
  /** Enter in the field submits, same as the Invite button. */
  onSubmit: () => void;
  disabled: boolean;
}

/**
 * Email input with suggestions drawn from people the viewer already shares a
 * workspace with (see suggestInviteEmailsAction for why it isn't a global user
 * search). Anyone else can still be invited by typing their address in full.
 */
export function InviteEmailField({ value, onChange, onSubmit, disabled }: InviteEmailFieldProps) {
  const listboxId = useId();
  const [debounced, setDebounced] = useState(value);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), SUGGEST_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [value]);

  const trimmed = debounced.trim();
  const { data } = useQuery({
    queryKey: ["inviteSuggestions", trimmed.toLowerCase()],
    queryFn: () => unwrapAction(suggestInviteEmailsAction(trimmed)),
    enabled: trimmed.length >= MIN_QUERY_LENGTH,
    // Who shares a workspace with you barely changes between keystrokes.
    staleTime: 60_000,
  });

  const suggestions = data?.suggestions ?? [];
  const showList = open && suggestions.length > 0;

  // Clicking anywhere else closes the list. Pointerdown rather than click so it
  // closes before a click elsewhere lands.
  useEffect(() => {
    if (!showList) return;
    function handlePointerDown(e: PointerEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [showList]);

  function choose(email: string) {
    onChange(email);
    setOpen(false);
    setActiveIndex(-1);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      // Enter picks the highlighted suggestion if the user arrowed to one;
      // otherwise it submits whatever they typed.
      if (showList && activeIndex >= 0) choose(suggestions[activeIndex].email);
      else onSubmit();
      return;
    }
    if (e.key === "Escape") {
      setOpen(false);
      setActiveIndex(-1);
      return;
    }
    if (!showList) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => (i + 1) % suggestions.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => (i <= 0 ? suggestions.length - 1 : i - 1));
    }
  }

  return (
    <div ref={containerRef} className="relative min-w-0 flex-1">
      <input
        type="email"
        placeholder="teammate@company.com"
        value={value}
        disabled={disabled}
        autoComplete="off"
        role="combobox"
        aria-expanded={showList}
        aria-controls={listboxId}
        aria-autocomplete="list"
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
          setActiveIndex(-1);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={handleKeyDown}
        className="h-9 w-full rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 text-[13px] text-foreground placeholder:text-muted-foreground outline-none focus:border-primary/50 disabled:opacity-50"
      />

      {showList && (
        <ul
          id={listboxId}
          role="listbox"
          className="absolute inset-x-0 top-full z-20 mt-1 overflow-hidden rounded-lg border border-white/[0.08] bg-[#131314] shadow-2xl"
        >
          {suggestions.map((suggestion, index) => (
            <li key={suggestion.email} role="option" aria-selected={index === activeIndex}>
              <button
                type="button"
                // Mousedown, not click: the input's blur would otherwise close
                // the list before the click could register.
                onMouseDown={(e) => {
                  e.preventDefault();
                  choose(suggestion.email);
                }}
                onMouseEnter={() => setActiveIndex(index)}
                className={`flex w-full flex-col items-start gap-0.5 px-3 py-2 text-left ${
                  index === activeIndex ? "bg-white/[0.08]" : "hover:bg-white/[0.06]"
                }`}
              >
                <span className="truncate text-[12.5px] text-foreground">{suggestion.email}</span>
                {suggestion.name && (
                  <span className="truncate text-[11px] text-muted-foreground">{suggestion.name}</span>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
