"use client";

import * as React from "react";
import { ContextMenu as ContextMenuPrimitive } from "@base-ui/react/context-menu";

import { cn } from "@/lib/utils";

const ContextMenu = ContextMenuPrimitive.Root;
const ContextMenuTrigger = ContextMenuPrimitive.Trigger;
const ContextMenuPortal = ContextMenuPrimitive.Portal;

function ContextMenuContent({
  className,
  children,
  ...props
}: ContextMenuPrimitive.Popup.Props) {
  return (
    <ContextMenuPortal>
      <ContextMenuPrimitive.Positioner>
        <ContextMenuPrimitive.Popup
          data-slot="context-menu-content"
          className={cn(
            "data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 min-w-40 rounded-xl border border-white/[0.08] bg-[#131314] p-1 shadow-2xl outline-none",
            className,
          )}
          {...props}
        >
          {children}
        </ContextMenuPrimitive.Popup>
      </ContextMenuPrimitive.Positioner>
    </ContextMenuPortal>
  );
}

function ContextMenuItem({
  className,
  destructive,
  ...props
}: ContextMenuPrimitive.Item.Props & { destructive?: boolean }) {
  return (
    <ContextMenuPrimitive.Item
      data-slot="context-menu-item"
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

export { ContextMenu, ContextMenuTrigger, ContextMenuContent, ContextMenuItem };
