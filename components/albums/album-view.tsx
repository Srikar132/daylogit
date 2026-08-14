"use client";

import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Folder, FolderPlus, ImagePlus, Images, Menu, X } from "lucide-react";
import Link from "next/link";
import { useRef, useState } from "react";
import {
  createAlbumGroup,
  deleteAlbumGroup,
  getAlbumImages,
  renameAlbumAction,
  renameAlbumGroup,
  type AlbumGroupRow,
  type AlbumImagesPage,
  type AlbumRow,
} from "@/lib/actions/albums";
import { unwrapAction } from "@/lib/query-utils";
import { PhotoGrid } from "@/components/albums/photo-grid";
import { UploadDropzone } from "@/components/albums/upload-dropzone";
import { useAlbumUpload } from "@/components/albums/use-album-upload";
import { Lightbox } from "@/components/albums/lightbox";
import { BulkActionBar } from "@/components/albums/bulk-action-bar";

interface AlbumViewProps {
  slug: string;
  album: AlbumRow;
  initialGroups: AlbumGroupRow[];
  initialImagesPage: AlbumImagesPage;
  canWrite: boolean;
}

/** "all" = every photo regardless of group; "ungrouped" = no group; anything
 *  else is a real group id. */
type Filter = "all" | "ungrouped" | string;

function filterToGroupId(filter: Filter): string | null | undefined {
  if (filter === "all") return undefined;
  if (filter === "ungrouped") return null;
  return filter;
}

export function AlbumView({ slug, album, initialGroups, initialImagesPage, canWrite }: AlbumViewProps) {
  const [name, setName] = useState(album.name);
  const [groups, setGroups] = useState<AlbumGroupRow[]>(initialGroups);
  const [filter, setFilter] = useState<Filter>("all");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");

  const queryClient = useQueryClient();

  // Cached per (album, filter) — switching group tabs and back no longer
  // refetches a tab that's already been loaded this session. The "all"
  // filter seeds from the server-prefetched first page; any other filter's
  // first visit fetches for real, then is cached same as "all" from then on.
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
  } = useInfiniteQuery({
    queryKey: ["albumImages", album.id, filter],
    queryFn: ({ pageParam }) => getAlbumImages(album.id, { groupId: filterToGroupId(filter), cursor: pageParam }),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    initialData: filter === "all" ? { pages: [initialImagesPage], pageParams: [null] } : undefined,
    staleTime: 30_000,
  });

  const images = data?.pages.flatMap((p) => p.images) ?? [];

  // The canvas gallery card caches this album's preview (count + latest 3)
  // under this same key — now that the QueryClient is shared across route
  // navigation (see app/providers.tsx) instead of being torn down on every
  // nav, a long-lived cache entry would otherwise show a stale count/thumbs
  // after editing here and going back to the canvas. Invalidating the
  // images query with just [albumId] (no filter) matches every filter
  // variant at once — a move/delete can affect more than the tab you're
  // currently looking at (e.g. moving a photo out of the group you're in).
  function invalidateAlbum() {
    void queryClient.invalidateQueries({ queryKey: ["albumImages", album.id] });
    void queryClient.invalidateQueries({ queryKey: ["albumPreview", album.id] });
  }

  const renameAlbumMutation = useMutation({
    mutationFn: (value: string) => unwrapAction(renameAlbumAction(album.id, value)),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["albumPreview", album.id] }),
    onError: (err) => console.error("Failed to rename album:", err),
  });

  const nameSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  function handleNameChange(value: string) {
    setName(value);
    if (nameSaveTimer.current) clearTimeout(nameSaveTimer.current);
    nameSaveTimer.current = setTimeout(() => renameAlbumMutation.mutate(value), 600);
  }

  const createGroupMutation = useMutation({
    mutationFn: (groupName: string) => unwrapAction(createAlbumGroup(album.id, groupName)),
    onSuccess: (res, groupName) => {
      if (res.id) {
        setGroups((prev) => [...prev, { id: res.id!, albumId: album.id, name: groupName, position: prev.length, createdAt: new Date() }]);
        setNewGroupName("");
      }
    },
    onError: (err) => console.error("Failed to create group:", err),
  });

  function handleAddGroup(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = newGroupName.trim();
    if (!trimmed) return;
    createGroupMutation.mutate(trimmed);
  }

  const renameGroupMutation = useMutation({
    mutationFn: (input: { id: string; name: string }) => unwrapAction(renameAlbumGroup(input.id, album.id, input.name)),
    onError: (err) => console.error("Failed to rename group:", err),
  });

  function handleRenameGroup(id: string, newName: string) {
    setGroups((prev) => prev.map((g) => (g.id === id ? { ...g, name: newName } : g)));
    renameGroupMutation.mutate({ id, name: newName });
  }

  const deleteGroupMutation = useMutation({
    mutationFn: (id: string) => unwrapAction(deleteAlbumGroup(id, album.id)),
    onSuccess: invalidateAlbum,
    onError: (err) => console.error("Failed to delete group:", err),
  });

  function handleDeleteGroup(id: string, name: string) {
    if (!window.confirm(`Delete "${name}"? Its photos become ungrouped — nothing is deleted.`)) return;
    setGroups((prev) => prev.filter((g) => g.id !== id));
    if (filter === id) setFilter("all");
    deleteGroupMutation.mutate(id);
  }

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function handleUploaded() {
    invalidateAlbum();
  }

  function selectFilter(next: Filter) {
    setFilter(next);
    setSelectedIds(new Set());
    setSidebarOpen(false);
  }

  const { uploadFiles, pending, dismissPending } = useAlbumUpload(album.id, filterToGroupId(filter) ?? null, handleUploaded);

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    if (!canWrite) return;
    if (e.dataTransfer.files?.length) uploadFiles(e.dataTransfer.files);
  }

  return (
    <div className="flex h-screen flex-col bg-[#1e1f20] text-[#e8eaed]">
      <div className="flex h-14 shrink-0 items-center gap-2 border-b border-white/[0.06] bg-[#131314] px-3 sm:gap-3 sm:px-4">
        <button
          type="button"
          onClick={() => setSidebarOpen((v) => !v)}
          title="Groups"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[#9aa0a6] hover:bg-white/10 hover:text-[#e8eaed] md:hidden"
        >
          <Menu className="h-4 w-4" />
        </button>
        <Link
          href={`/workspace/${slug}`}
          title="Back to canvas"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[#9aa0a6] hover:bg-white/10 hover:text-[#e8eaed]"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <input
          type="text"
          value={name}
          onChange={(e) => handleNameChange(e.target.value)}
          disabled={!canWrite}
          placeholder="Untitled album"
          className="min-w-0 flex-1 truncate rounded-lg bg-transparent px-1.5 -mx-1.5 text-[13.5px] font-semibold text-[#e8eaed] outline-none transition-colors disabled:cursor-default enabled:hover:bg-white/[0.04] focus:bg-white/[0.06] sm:flex-none sm:text-[14px]"
        />
        <span className="flex items-center gap-1 rounded-full bg-white/[0.04] px-2.5 py-1 text-[11.5px] text-[#9aa0a6]">
          <Images className="h-3 w-3" />
          {images.length}
        </span>

        {canWrite && (
          <UploadDropzone
            uploadFiles={uploadFiles}
            className="ml-auto flex items-center gap-1.5 rounded-full bg-[#8ab4f8] px-2.5 py-1.5 text-[12px] font-semibold text-[#141414] shadow-[0_2px_8px_rgba(138,180,248,0.3)] transition-transform hover:bg-[#a6c8ff] active:scale-95 cursor-pointer sm:px-3.5"
          >
            <ImagePlus className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Add photos</span>
          </UploadDropzone>
        )}
      </div>

      <div className="relative flex min-h-0 flex-1">
        {sidebarOpen && (
          <div className="fixed inset-0 top-14 z-20 bg-black/50 md:hidden" onClick={() => setSidebarOpen(false)} />
        )}

        <div
          className={`fixed inset-y-14 left-0 z-30 flex w-56 flex-col border-r border-white/[0.06] bg-[#131314] transition-transform duration-200 md:static md:inset-y-auto md:z-auto md:translate-x-0 md:transition-none ${
            sidebarOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <div className="flex-1 overflow-y-auto scrollbar-thin p-2">
            <SidebarRow
              icon={Images}
              label="All photos"
              active={filter === "all"}
              onClick={() => selectFilter("all")}
            />
            <SidebarRow
              icon={Folder}
              label="Ungrouped"
              active={filter === "ungrouped"}
              onClick={() => selectFilter("ungrouped")}
            />
            <div className="mt-4 mb-1 px-2.5 text-[11px] font-medium uppercase tracking-wider text-[#5f6368]">
              Groups
            </div>
            {groups.map((g) => (
              <GroupRow
                key={g.id}
                group={g}
                active={filter === g.id}
                canWrite={canWrite}
                onClick={() => selectFilter(g.id)}
                onRename={(newName) => handleRenameGroup(g.id, newName)}
                onDelete={() => handleDeleteGroup(g.id, g.name)}
              />
            ))}
          </div>
          {canWrite && (
            <form onSubmit={handleAddGroup} className="flex items-center gap-1.5 border-t border-white/[0.06] p-2">
              <input
                type="text"
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                placeholder="New group"
                className="min-w-0 flex-1 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-[12px] text-[#e8eaed] placeholder:text-[#5f6368] outline-none focus:border-[#8ab4f8]/50"
              />
              <button
                type="submit"
                disabled={createGroupMutation.isPending || !newGroupName.trim()}
                title="Add group"
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[#9aa0a6] hover:bg-white/10 hover:text-[#e8eaed] disabled:opacity-40 cursor-pointer"
              >
                <FolderPlus className="h-3.5 w-3.5" />
              </button>
            </form>
          )}
        </div>

        <div
          className="min-h-0 flex-1 overflow-y-auto bg-[#1e1f20] p-4 sm:p-6"
          onDragOver={(e) => canWrite && e.preventDefault()}
          onDrop={handleDrop}
        >
          <PhotoGrid
            images={images}
            pendingUploads={pending}
            onDismissPending={dismissPending}
            selectedIds={selectedIds}
            canWrite={canWrite}
            onToggleSelect={toggleSelect}
            onOpenLightbox={setLightboxIndex}
            hasMore={!!hasNextPage}
            loadingMore={isFetchingNextPage}
            onLoadMore={() => void fetchNextPage()}
            groups={groups}
            onRefresh={invalidateAlbum}
            isSwitching={isLoading}
          />
        </div>
      </div>

      {selectedIds.size > 0 && (
        <BulkActionBar
          selectedIds={selectedIds}
          images={images}
          groups={groups}
          onClear={() => setSelectedIds(new Set())}
          onDone={invalidateAlbum}
        />
      )}

      {lightboxIndex !== null && (
        <Lightbox
          images={images}
          index={lightboxIndex}
          groups={groups}
          canWrite={canWrite}
          onClose={() => setLightboxIndex(null)}
          onIndexChange={setLightboxIndex}
          onChanged={invalidateAlbum}
        />
      )}
    </div>
  );
}

function SidebarRow({
  icon: Icon,
  label,
  active,
  onClick,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <div
      onClick={onClick}
      className={`flex items-center gap-2 rounded-lg px-2.5 py-2 cursor-pointer transition-colors ${
        active ? "bg-[#8ab4f8]/10 text-[#8ab4f8]" : "text-[#9aa0a6] hover:bg-white/5 hover:text-[#e8eaed]"
      }`}
    >
      <Icon className="h-3.5 w-3.5 shrink-0" />
      <span className="min-w-0 flex-1 truncate text-[13px] font-medium">{label}</span>
    </div>
  );
}

function GroupRow({
  group,
  active,
  canWrite,
  onClick,
  onRename,
  onDelete,
}: {
  group: AlbumGroupRow;
  active: boolean;
  canWrite: boolean;
  onClick: () => void;
  onRename: (name: string) => void;
  onDelete: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(group.name);

  if (editing) {
    return (
      <input
        type="text"
        value={value}
        autoFocus
        onChange={(e) => setValue(e.target.value)}
        onBlur={() => {
          setEditing(false);
          if (value.trim() && value.trim() !== group.name) onRename(value.trim());
          else setValue(group.name);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") e.currentTarget.blur();
          if (e.key === "Escape") {
            setValue(group.name);
            setEditing(false);
          }
        }}
        className="mb-0.5 w-full rounded-lg border border-[#8ab4f8]/40 bg-white/5 px-2.5 py-1.5 text-[13px] text-[#e8eaed] outline-none"
      />
    );
  }

  return (
    <div
      onClick={onClick}
      onDoubleClick={() => canWrite && setEditing(true)}
      className={`group flex items-center gap-2 rounded-lg px-2.5 py-2 cursor-pointer transition-colors ${
        active ? "bg-[#8ab4f8]/10 text-[#8ab4f8]" : "text-[#9aa0a6] hover:bg-white/5 hover:text-[#e8eaed]"
      }`}
    >
      <Folder className="h-3.5 w-3.5 shrink-0" />
      <span className="min-w-0 flex-1 truncate text-[13px] font-medium">{group.name}</span>
      {canWrite && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="flex h-4 w-4 shrink-0 items-center justify-center rounded text-[#5f6368] opacity-0 hover:text-[#f28b82] group-hover:opacity-100 cursor-pointer"
        >
          <X className="h-3 w-3" />
        </button>
      )}
    </div>
  );
}
