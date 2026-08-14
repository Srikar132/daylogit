# Progress Tracker

Update this file after every meaningful implementation
change.

## Current Phase

- In progress — platform hardening (caching, upload architecture, scale) after the gallery/album feature + widgets-per-row migration + full TanStack Query conversion (branch: `feature/gallery-widgets-tanstack-migration`, pushed).

## Current Goal

- Work through the queued system-design items below one at a time, sorted by (ease, priority) — easiest + highest-value first.

## Completed

- **Rate limiting on mutations** — `lib/rate-limit.ts` wraps `@upstash/ratelimit` + `@upstash/redis`, two tiers: `checkRateLimit` (30 req/60s per action-type+user) for deliberate actions, `checkDragRateLimit` (300 req/60s) for high-frequency-but-cheap writes. No-ops (always allows) if `UPSTASH_REDIS_REST_URL`/`TOKEN` aren't set. Applied to `/api/media/upload` and every write action in `lib/actions/albums.ts` (13 sites, standard tier: create/rename/delete album, create/rename/delete group, add/rename/delete/move/copy image, bulk delete/move). In `lib/actions/widgets.ts`: `createWidgetAction`/`deleteWidgetAction` on the standard tier; `updateWidgetPositionAction`/`updateWidgetSizeAction`/`updateWidgetDataAction` on the drag tier — these fire on every drag-settle/keystroke (real usage, not abuse), so they get a much bigger budget rather than being skipped outright. Upstash credentials live in `.env.local` (gitignored, confirmed).
- **Stop blocking on Cloudinary cleanup in the request path** — `deleteAlbumAction`/`deleteImageAction`/`bulkDeleteImagesAction` in `lib/actions/albums.ts` now delete the DB rows + `revalidatePath` first, then run the Cloudinary `destroy` calls via `after()` (`next/server`) instead of awaiting them inline. Delete responds instantly regardless of Cloudinary latency; `after()` (not a bare fire-and-forget) keeps the cleanup running past the point the function would otherwise freeze once the response is sent.
- **Persist TanStack Query cache across reloads** — `@tanstack/react-query-persist-client` + `@tanstack/query-sync-storage-persister` (localStorage) wired into `app/providers.tsx`. Mutations never persist (`shouldDehydrateMutation: () => false`); `gmailMessages` excluded from persistence (email content shouldn't sit in localStorage indefinitely); 24h `maxAge`; `buster: "v1"` to invalidate everyone's persisted cache on a future incompatible shape change. Fixed a hydration mismatch this introduced (see Architecture Decisions).
- Gallery/album widget: canvas fan-card + full album page (groups, lightbox, bulk actions, upload).
- Schema migration: `widget_layouts` (one JSONB blob/user) → `widgets` (one row/widget). Reposition/resize/create/delete now touch only the one row.
- Root-level `QueryClient` (`app/providers.tsx`) — survives client-side nav, no more cache wipe on route change.
- Full client-fetch audit + conversion: every read is `useQuery`/`useInfiniteQuery`, every write is `useMutation` via shared `unwrapAction()` helper (`lib/query-utils.ts`), across canvas widgets, docs, workspace settings, board, connections.
- Cross-query cache invalidation wired (album images ↔ gallery preview, workspace members ↔ settings widget).
- A few full-content spinners replaced with content-shaped skeletons (bookmark preview fetch, media upload placeholder).

## In Progress

- None yet — about to start item 1 below.

## Next Up

1. **Direct-to-Cloudinary upload** (medium-high effort, highest architectural value) — `/api/media/upload` currently proxies the whole file through the Next server (double bandwidth, function held open for the upload duration). Switch to signed direct upload: server issues signed params, client (media-widget + use-album-upload) uploads straight to Cloudinary.
2. **Replace blunt `revalidatePath("/workspace", "layout")` with tagged cache invalidation** (medium-high effort) — Next 16 `"use cache"` + `cacheTag`/`updateTag` (or `unstable_cache` if staying conservative), scoped to what actually changed instead of the whole layout.
3. **Proper background job for Cloudinary cleanup** (medium effort, low-medium priority — only matters once album sizes get large) — replace the `after()` fire-and-forget with a real queue (Vercel Queues) or a cron sweep for orphaned assets.
4. **Virtualize the photo grid** (medium effort, low priority now) — `react-virtuoso`/`react-window` once albums regularly hold thousands of loaded images; today's DOM-all-loaded-items approach is fine at current scale.
5. **Canvas node spatial index** (high effort, low priority) — react-flow's viewport culling is an O(n) scan; only worth a quad-tree once widget counts reach the many-hundreds.

## Open Questions

- Concurrent edits on shared album data (two workspace members editing the same photo) are currently last-write-wins with no conflict resolution. Acceptable at small-team scale — revisit only if workspaces grow to many concurrent editors.
- Whether/when this app goes public-facing — determines how urgently #3 (rate limiting) actually needs to land.

## Architecture Decisions

- **Widgets-per-row (`widgets` table), not one JSONB array per user** — moving one widget was rewriting every widget's data on every drag/resize. `widget_layouts` kept in place, unused, as a rollback source.
- **One root-level QueryClient, not one per dashboard mount** — a client created inside a page component gets torn down on every client-side route change, wiping the whole cache and forcing every widget to refetch everything.
- **`unwrapAction()` bridges `{error?: string}`-returning server actions into TanStack Query** — actions here return an error object instead of throwing; useMutation's onError/retry only fires on a real rejection, so every mutationFn/queryFn wraps its action call with this helper.
- **Cloudinary stays as the media store** (not migrating to Vercel Blob) — already CDN-backed, already wired through the whole upload path; only the transport (proxied vs. direct-to-cloud) needs to change, not the storage provider.
- **Never branch which provider COMPONENT renders based on `typeof window`** — the persist-client setup initially rendered `QueryClientProvider` on the server and `PersistQueryClientProvider` on the client (different component tree shapes), which shifted every downstream `useId()`-based id (base-ui's `Checkbox`/`Menu`, etc.) and caused a hydration mismatch. Fix: always render the same provider; only the *storage backing* differs by environment (a no-op stub during SSR, real `localStorage` on the client).

## Session Notes

- Branch `feature/gallery-widgets-tanstack-migration` is pushed to origin, one commit, not yet merged to `main`.
- Full verification convention: `rm -rf .next && npx tsc --noEmit`, `npx eslint app components lib tests`, `npx vitest run`, `timeout 150 npx next build` — run all four after every meaningful change in this list.
- Work through "Next Up" strictly one item at a time; update this file's Completed/In Progress/Next Up sections as each lands before starting the next.
