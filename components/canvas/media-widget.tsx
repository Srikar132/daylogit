"use client";

import { AlertCircle, Copy, Download, Link as LinkIcon, Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useCanvasActions } from "@/components/canvas/canvas-actions-context";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { Skeleton } from "@/components/ui/skeleton";

interface MediaWidgetProps {
  id: string;
  data?: Record<string, unknown>;
  canWrite: boolean;
}

type UploadResponse = {
  url?: string;
  resourceType?: "image" | "video";
  width?: number;
  height?: number;
  error?: string;
};

type MediaData =
  | { status: "uploading" }
  | { status: "ready"; url: string; resourceType: "image" | "video" }
  | { status: "error"; message: string };

const MAX_MEDIA_DIMENSION = 420;
const MIN_MEDIA_DIMENSION = 120;

/** Scales the source dimensions to fit the node inside a sane size range,
 *  preserving aspect ratio either way — down if the long edge is too big,
 *  up if the short edge is too small. */
function fitToAspect(width: number, height: number): { width: number; height: number } {
  const shrink = Math.min(MAX_MEDIA_DIMENSION / Math.max(width, height), 1);
  const grow = Math.max(MIN_MEDIA_DIMENSION / Math.min(width, height), 1);
  const scale = shrink < 1 ? shrink : grow;
  return { width: Math.round(width * scale), height: Math.round(height * scale) };
}

function readMediaData(data: Record<string, unknown> | undefined): MediaData {
  if (data?.status === "ready" && typeof data.url === "string") {
    return { status: "ready", url: data.url, resourceType: data.resourceType === "video" ? "video" : "image" };
  }
  if (data?.status === "error") {
    return { status: "error", message: typeof data.message === "string" ? data.message : "Upload failed." };
  }
  return { status: "uploading" };
}

export function MediaWidget({ id, data, canWrite }: MediaWidgetProps) {
  const { updateWidgetData, deleteWidget, getPendingFile, clearPendingFile, resizeWidget } =
    useCanvasActions();
  const media = readMediaData(data);
  const [progress, setProgress] = useState(0);
  const startedRef = useRef(false);

  function upload(file: File) {
    setProgress(0);
    const xhr = new XMLHttpRequest();
    const formData = new FormData();
    formData.append("file", file);

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) setProgress(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () => {
      let payload: UploadResponse = {};
      try {
        payload = JSON.parse(xhr.responseText);
      } catch {
        payload = { error: "Upload failed. Try again." };
      }
      if (xhr.status >= 200 && xhr.status < 300 && payload.url) {
        clearPendingFile(id);
        updateWidgetData(id, {
          status: "ready",
          url: payload.url,
          resourceType: payload.resourceType ?? "image",
        });
        if (payload.width && payload.height) {
          resizeWidget(id, fitToAspect(payload.width, payload.height));
        }
      } else {
        startedRef.current = false;
        updateWidgetData(id, { status: "error", message: payload.error ?? "Upload failed. Try again." });
      }
    };
    xhr.onerror = () => {
      startedRef.current = false;
      updateWidgetData(id, { status: "error", message: "Network error during upload." });
    };
    xhr.open("POST", "/api/media/upload");
    xhr.send(formData);
  }

  useEffect(() => {
    if (media.status !== "uploading" || startedRef.current) return;
    const file = getPendingFile(id);
    if (!file) {
      updateWidgetData(id, { status: "error", message: "Upload was lost — remove this and paste again." });
      return;
    }
    startedRef.current = true;
    // Legitimate kick-off-external-work-on-mount pattern (same precedent as
    // mail-summary-widget's fetch-on-mount) — there's no prop/state this
    // upload could be derived from during render, it's an XHR against
    // Cloudinary triggered by the file this widget was created to carry.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    upload(file);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [media.status]);

  function retry() {
    const file = getPendingFile(id);
    if (!file) {
      updateWidgetData(id, { status: "error", message: "Upload was lost — remove this and paste again." });
      return;
    }
    startedRef.current = true;
    updateWidgetData(id, { status: "uploading" });
    upload(file);
  }

  async function copyImage(url: string) {
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      await navigator.clipboard.write([new ClipboardItem({ [blob.type]: blob })]);
    } catch {
      await navigator.clipboard.writeText(url);
    }
  }

  function download(url: string) {
    const a = document.createElement("a");
    a.href = url;
    a.download = "";
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  if (media.status === "uploading") {
    // Shaped like where the image/video itself will end up (fills the
    // card) rather than a generic centered spinner — the progress bar still
    // carries the one thing a skeleton can't (actual upload percentage).
    return (
      <div className="relative h-full w-full overflow-hidden rounded-2xl">
        <Skeleton className="absolute inset-0 rounded-2xl" />
        <div className="absolute inset-x-0 bottom-0 flex flex-col items-center gap-2 p-4 text-center">
          <div className="w-full max-w-[180px] overflow-hidden rounded-full bg-black/40">
            <div
              className="h-1 rounded-full bg-[#8ab4f8] transition-[width] duration-150"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-[11.5px] text-white/80">Uploading… {progress}%</p>
        </div>
      </div>
    );
  }

  if (media.status === "error") {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
        <AlertCircle className="h-5 w-5 text-[#f28b82]" />
        <p className="text-[12px] text-[#f28b82]">{media.message}</p>
        {canWrite && (
          <div className="flex gap-2">
            <button
              type="button"
              onClick={retry}
              className="rounded-full bg-white/[0.06] px-3 py-1 text-[11.5px] text-[#e8eaed] hover:bg-white/10 cursor-pointer"
            >
              Retry
            </button>
            <button
              type="button"
              onClick={() => deleteWidget(id)}
              className="rounded-full bg-[#f28b82]/10 px-3 py-1 text-[11.5px] text-[#f28b82] hover:bg-[#f28b82]/20 cursor-pointer"
            >
              Remove
            </button>
          </div>
        )}
      </div>
    );
  }

  const { url, resourceType } = media;

  return (
    <ContextMenu>
      {/* No "nodrag" here on purpose — this widget is chromeless (no header
          bar), so grabbing the media itself is how the node gets repositioned. */}
      <ContextMenuTrigger className="flex h-full w-full items-center justify-center overflow-hidden bg-black/20">
        {resourceType === "video" ? (
          <video src={url} controls className="h-full w-full object-contain" />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt="" className="h-full w-full object-contain" />
        )}
      </ContextMenuTrigger>
      <ContextMenuContent>
        {resourceType === "image" && (
          <ContextMenuItem onClick={() => copyImage(url)}>
            <Copy className="h-3.5 w-3.5" /> Copy image
          </ContextMenuItem>
        )}
        <ContextMenuItem onClick={() => navigator.clipboard.writeText(url)}>
          <LinkIcon className="h-3.5 w-3.5" /> Copy link
        </ContextMenuItem>
        <ContextMenuItem onClick={() => download(url)}>
          <Download className="h-3.5 w-3.5" /> Download
        </ContextMenuItem>
        {canWrite && (
          <ContextMenuItem destructive onClick={() => deleteWidget(id)}>
            <Trash2 className="h-3.5 w-3.5" /> Delete
          </ContextMenuItem>
        )}
      </ContextMenuContent>
    </ContextMenu>
  );
}
