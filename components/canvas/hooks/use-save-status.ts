import { useCallback, useState } from "react";

/**
 * One "did the canvas fail to persist something" flag, shared by every hook
 * that writes a widget row.
 *
 * It used to live inside use-widget-layout, so only position/size saves could
 * raise it — a failed *content* save (a note's text, a bookmark's url) went to
 * console.error and nowhere else, which is the worse loss of the two: the user
 * keeps editing against state the server never accepted and only finds out on
 * the next reload, when the work is gone.
 */
export type SaveStatus = {
  saveFailed: boolean;
  reportSaveFailed: () => void;
  reportSaveSucceeded: () => void;
};

export function useSaveStatus(): SaveStatus {
  const [saveFailed, setSaveFailed] = useState(false);

  return {
    saveFailed,
    reportSaveFailed: useCallback(() => setSaveFailed(true), []),
    reportSaveSucceeded: useCallback(() => setSaveFailed(false), []),
  };
}

/** Shared react-query settings for widget writes: absorb one blip, then admit
 *  the failure rather than pretending it saved. */
export const WIDGET_SAVE_RETRY = { retry: 1, retryDelay: 2000 } as const;
