"use client";

import { Toast } from "@base-ui/react/toast";
import { AlertCircle, CheckCircle2, X } from "lucide-react";
import { toastManager } from "@/lib/toast";
import { cn } from "@/lib/utils";

/** Mounted once at the root (app/providers.tsx) — components anywhere else
 *  just import `toastManager` from lib/toast.ts and call `.add(...)`. */
export function Toaster() {
  return (
    <Toast.Provider toastManager={toastManager}>
      <ToastList />
    </Toast.Provider>
  );
}

function ToastList() {
  const { toasts } = Toast.useToastManager();

  return (
    <Toast.Portal>
      <Toast.Viewport className="fixed inset-x-0 bottom-4 z-50 mx-auto flex w-[calc(100%-2rem)] max-w-sm flex-col gap-2 sm:right-4 sm:left-auto">
        {toasts.map((toast) => (
          <Toast.Root
            key={toast.id}
            toast={toast}
            className={cn(
              "relative rounded-xl border bg-[#131314] p-3 pr-8 shadow-2xl",
              "data-[transition-status=starting]:translate-y-2 data-[transition-status=starting]:opacity-0",
              "data-[transition-status=ending]:opacity-0",
              "transition-all duration-200",
              toast.type === "error" ? "border-[#f28b82]/25" : "border-white/[0.08]",
            )}
          >
            <Toast.Content className="flex items-start gap-2">
              {toast.type === "error" ? (
                <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#f28b82]" />
              ) : (
                <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#81c995]" />
              )}
              <div className="min-w-0">
                <Toast.Title className="text-[12.5px] font-medium text-[#e8eaed]" />
                <Toast.Description className="mt-0.5 text-[11.5px] text-[#9aa0a6]" />
              </div>
            </Toast.Content>
            <Toast.Close className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full text-[#5f6368] hover:bg-white/10 hover:text-[#e8eaed] cursor-pointer">
              <X className="h-3 w-3" />
            </Toast.Close>
          </Toast.Root>
        ))}
      </Toast.Viewport>
    </Toast.Portal>
  );
}
