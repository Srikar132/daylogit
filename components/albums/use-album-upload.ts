"use client";

import { useMutation } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { addImageToAlbum, type AlbumImageRow } from "@/lib/actions/albums";
import { unwrapAction } from "@/lib/query-utils";

type UploadResponse = {
  url?: string;
  width?: number;
  height?: number;
  publicId?: string;
  error?: string;
};

export type PendingUpload = { id: string; progress: number; error?: string };

/** Same XHR-with-progress upload against /api/media/upload as media-widget's
 *  upload() — reused as-is rather than duplicated, just followed by an
 *  addImageToAlbum call to attach the result to this album/group. Exposes
 *  per-file progress/error so the grid can render a real placeholder tile
 *  instead of uploads happening invisibly in the background. */
export function useAlbumUpload(albumId: string, groupId: string | null, onUploaded: (image: AlbumImageRow) => void) {
  const [pending, setPending] = useState<PendingUpload[]>([]);
  const nextId = useRef(0);

  const attachMutation = useMutation({
    mutationFn: (input: Parameters<typeof addImageToAlbum>[0]) => unwrapAction(addImageToAlbum(input)),
  });

  function uploadOne(file: File) {
    const localId = `pending-${nextId.current++}`;
    setPending((prev) => [{ id: localId, progress: 0 }, ...prev]);

    const xhr = new XMLHttpRequest();
    const formData = new FormData();
    formData.append("file", file);

    xhr.upload.onprogress = (e) => {
      if (!e.lengthComputable) return;
      const progress = Math.round((e.loaded / e.total) * 100);
      setPending((prev) => prev.map((p) => (p.id === localId ? { ...p, progress } : p)));
    };

    xhr.onload = () => {
      let payload: UploadResponse = {};
      try {
        payload = JSON.parse(xhr.responseText);
      } catch {
        payload = { error: "Upload failed." };
      }
      if (xhr.status >= 200 && xhr.status < 300 && payload.url) {
        const url = payload.url;
        attachMutation.mutate(
          {
            albumId,
            url,
            width: payload.width,
            height: payload.height,
            cloudinaryPublicId: payload.publicId,
            groupId: groupId ?? undefined,
          },
          {
            onSuccess: (res) => {
              setPending((prev) => prev.filter((p) => p.id !== localId));
              if (res.id) {
                onUploaded({
                  id: res.id,
                  albumId,
                  groupId,
                  url,
                  width: payload.width ?? null,
                  height: payload.height ?? null,
                  name: null,
                  cloudinaryPublicId: payload.publicId ?? null,
                  createdBy: null,
                  createdAt: new Date(),
                });
              }
            },
            onError: (err) => {
              setPending((prev) => prev.map((p) => (p.id === localId ? { ...p, error: err.message } : p)));
            },
          },
        );
      } else {
        setPending((prev) => prev.map((p) => (p.id === localId ? { ...p, error: payload.error ?? "Upload failed." } : p)));
      }
    };
    xhr.onerror = () => {
      setPending((prev) => prev.map((p) => (p.id === localId ? { ...p, error: "Network error." } : p)));
    };
    xhr.open("POST", "/api/media/upload");
    xhr.send(formData);
  }

  function uploadFiles(files: FileList | File[]) {
    for (const file of Array.from(files)) {
      if (file.type.startsWith("image/")) uploadOne(file);
    }
  }

  function dismissPending(id: string) {
    setPending((prev) => prev.filter((p) => p.id !== id));
  }

  return { uploadFiles, pending, dismissPending };
}
