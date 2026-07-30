"use client";

import { ChevronDown, Tag } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { CategoryTag } from "@/components/category-tag";
import type { Category } from "@/lib/constants";

interface CategoryDropdownProps {
  categories: string[];
}

export function CategoryDropdown({ categories }: CategoryDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const primaryCategory = categories[0] as Category;

  return (
    <div ref={dropdownRef} className="relative inline-flex items-center gap-1 text-left">
      {/* Primary Category Tag */}
      <CategoryTag category={primaryCategory} />

      {/* Clean Dropdown Button beside it (NO outer border) */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="group flex items-center gap-0.5 rounded-md p-0.5 text-[11.5px] font-medium text-[#8ab4f8] transition-colors hover:text-[#a6c8ff] focus:outline-none"
      >
        <span className="text-[11px] font-semibold">
          +{categories.length - 1}
        </span>
        <ChevronDown
          className={`h-3.5 w-3.5 text-[#9aa0a6] transition-transform duration-200 group-hover:text-[#8ab4f8] ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {/* Dropdown Menu Popup */}
      {isOpen && (
        <div className="absolute left-0 top-full z-50 mt-1.5 w-48 overflow-hidden rounded-2xl border border-white/10 bg-[#2b2b2b] p-2 shadow-2xl animate-in fade-in zoom-in-95">
          <div className="flex items-center gap-1.5 border-b border-white/8 px-2.5 py-1.5 text-[10.5px] font-bold uppercase tracking-wider text-[#9aa0a6]">
            <Tag className="h-3 w-3 text-[#8ab4f8]" />
            <span>Categories ({categories.length})</span>
          </div>

          <div className="mt-1 flex flex-col gap-1 max-h-48 overflow-y-auto pr-1">
            {categories.map((cat) => (
              <div
                key={cat}
                className="flex items-center rounded-xl p-1 transition-colors hover:bg-white/5"
              >
                <CategoryTag category={cat as Category} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
