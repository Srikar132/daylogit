"use client";

import * as React from "react";
import { Menu as MenuPrimitive } from "@base-ui/react/menu";

import { cn } from "@/lib/utils";

const DropdownMenu = MenuPrimitive.Root;
const DropdownMenuTrigger = MenuPrimitive.Trigger;
const DropdownMenuPortal = MenuPrimitive.Portal;

function DropdownMenuContent({
  className,
  children,
  align = "end",
  ...props
}: MenuPrimitive.Popup.Props & { align?: "start" | "end" }) {
  return (
    <DropdownMenuPortal>
      <MenuPrimitive.Positioner side="bottom" align={align} sideOffset={6}>
        <MenuPrimitive.Popup
          data-slot="dropdown-menu-content"
          className={cn(
            "data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 min-w-40 rounded-xl border border-white/[0.08] bg-[#131314] p-1 shadow-2xl outline-none",
            className,
          )}
          {...props}
        >
          {children}
        </MenuPrimitive.Popup>
      </MenuPrimitive.Positioner>
    </DropdownMenuPortal>
  );
}

function DropdownMenuItem({
  className,
  destructive,
  ...props
}: MenuPrimitive.Item.Props & { destructive?: boolean }) {
  return (
    <MenuPrimitive.Item
      data-slot="dropdown-menu-item"
      className={cn(
        "flex cursor-pointer items-center gap-2 rounded-lg px-2.5 py-1.5 text-[12.5px] outline-none select-none",
        destructive
          ? "text-[#f28b82] data-highlighted:bg-[#f28b82]/10"
          : "text-[#e8eaed] data-highlighted:bg-white/[0.06]",
        className,
      )}
      {...props}
    />
  );
}

export { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem };
