"use client";

import { useMutation } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { addImageToAlbum, type AlbumImageRow } from "@/lib/actions/albums";
import { unwrapAction } from "@/lib/query-utils";
import { toastManager } from "@/lib/toast";
import { uploadToCloudinary } from "@/lib/upload-client";

export type PendingUpload = { id: string; progress: number; error?: string };

/** Uploads straight to Cloudinary (see lib/upload-client.ts — no file bytes
 *  proxied through our server), then attaches the result to this album/group.
 *  Exposes per-file progress/error so the grid can render a real placeholder
 *  tile instead of uploads happening invisibly in the background. */
export function useAlbumUpload(albumId: string, groupId: string | null, onUploaded: (image: AlbumImageRow) => void) {
  const [pending, setPending] = useState<PendingUpload[]>([]);
  const nextId = useRef(0);

  const attachMutation = useMutation({
    mutationFn: (input: Parameters<typeof addImageToAlbum>[0]) => unwrapAction(addImageToAlbum(input)),
  });

  function uploadOne(file: File) {
    const localId = `pending-${nextId.current++}`;
    setPending((prev) => [{ id: localId, progress: 0 }, ...prev]);

    uploadToCloudinary(file, (progress) => {
      setPending((prev) => prev.map((p) => (p.id === localId ? { ...p, progress } : p)));
    })
      .then((result) => {
        attachMutation.mutate(
          {
            albumId,
            url: result.url,
            width: result.width,
            height: result.height,
            cloudinaryPublicId: result.publicId,
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
                  url: result.url,
                  width: result.width ?? null,
                  height: result.height ?? null,
                  name: null,
                  cloudinaryPublicId: result.publicId ?? null,
                  createdBy: null,
                  createdAt: new Date(),
                });
                toastManager.add({ title: `${file.name} uploaded`, type: "success" });
              }
            },
            onError: (err) => {
              setPending((prev) => prev.map((p) => (p.id === localId ? { ...p, error: err.message } : p)));
              toastManager.add({ title: `${file.name} failed to attach`, description: err.message, type: "error" });
            },
          },
        );
      })
      .catch((err: Error) => {
        setPending((prev) => prev.map((p) => (p.id === localId ? { ...p, error: err.message } : p)));
        toastManager.add({ title: `${file.name} failed to upload`, description: err.message, type: "error" });
      });
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
