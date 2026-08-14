"use client";

import { useMutation } from "@tanstack/react-query";
import {
  bulkDeleteImagesAction,
  bulkMoveImagesAction,
  copyImageAction,
  deleteImageAction,
  moveImageToGroupAction,
  renameImageAction,
} from "@/lib/actions/albums";
import { unwrapAction } from "@/lib/query-utils";
import { toastManager } from "@/lib/toast";

function errorToast(title: string, err: Error) {
  toastManager.add({ title, description: err.message, type: "error" });
}

/** Shared by photo-grid.tsx's per-tile menu, lightbox.tsx's action bar, and
 *  bulk-action-bar.tsx — the same six write paths, previously duplicated
 *  (rename/delete/duplicate/move ×2, bulk delete/move) across those files
 *  as raw `.then(onChanged)` calls. */
export function useAlbumImageMutations(onChanged: () => void) {
  const rename = useMutation({
    mutationFn: (input: { id: string; name: string }) => unwrapAction(renameImageAction(input.id, input.name)),
    onSuccess: () => {
      onChanged();
      toastManager.add({ title: "Photo renamed", type: "success" });
    },
    onError: (err) => errorToast("Failed to rename photo", err),
  });

  const duplicate = useMutation({
    mutationFn: (input: { id: string; targetGroupId?: string | null }) =>
      unwrapAction(copyImageAction(input.id, input.targetGroupId)),
    onSuccess: () => {
      onChanged();
      toastManager.add({ title: "Photo duplicated", type: "success" });
    },
    onError: (err) => errorToast("Failed to duplicate photo", err),
  });

  const remove = useMutation({
    mutationFn: (id: string) => unwrapAction(deleteImageAction(id)),
    onSuccess: () => {
      onChanged();
      toastManager.add({ title: "Photo deleted", type: "success" });
    },
    onError: (err) => errorToast("Failed to delete photo", err),
  });

  const move = useMutation({
    mutationFn: (input: { id: string; groupId: string | null }) =>
      unwrapAction(moveImageToGroupAction(input.id, input.groupId)),
    onSuccess: (_data, input) => {
      onChanged();
      toastManager.add({ title: input.groupId ? "Photo moved" : "Removed from group", type: "success" });
    },
    onError: (err) => errorToast("Failed to move photo", err),
  });

  const bulkDelete = useMutation({
    mutationFn: (ids: string[]) => unwrapAction(bulkDeleteImagesAction(ids)),
    onSuccess: (_data, ids) => {
      onChanged();
      toastManager.add({ title: `${ids.length} photo${ids.length > 1 ? "s" : ""} deleted`, type: "success" });
    },
    onError: (err) => errorToast("Failed to delete photos", err),
  });

  const bulkMove = useMutation({
    mutationFn: (input: { ids: string[]; groupId: string | null }) =>
      unwrapAction(bulkMoveImagesAction(input.ids, input.groupId)),
    onSuccess: (_data, input) => {
      onChanged();
      toastManager.add({
        title: `${input.ids.length} photo${input.ids.length > 1 ? "s" : ""} moved`,
        type: "success",
      });
    },
    onError: (err) => errorToast("Failed to move photos", err),
  });

  return { rename, duplicate, remove, move, bulkDelete, bulkMove };
}
