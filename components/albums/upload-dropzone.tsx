"use client";

import { useRef } from "react";

interface UploadDropzoneProps {
  uploadFiles: (files: FileList | File[]) => void;
  className?: string;
  children: React.ReactNode;
}

/** Just the click-to-pick trigger — the actual upload function is owned by
 *  useAlbumUpload in AlbumView so the same upload path also backs
 *  drag-and-drop onto the grid, not just this button. */
export function UploadDropzone({ uploadFiles, className, children }: UploadDropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <>
      <button type="button" onClick={() => inputRef.current?.click()} className={className}>
        {children}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => {
          if (e.target.files?.length) uploadFiles(e.target.files);
          e.target.value = "";
        }}
      />
    </>
  );
}
