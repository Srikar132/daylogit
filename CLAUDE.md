# Rules for this codebase

- **All client-side data fetching goes through TanStack Query.** Reads use `useQuery`/`useInfiniteQuery`; writes use `useMutation`. Never call a server action or `fetch()` directly from a `useEffect`, event handler, or `.then()` chain.
- Server actions return `{ error?: string }` on failure instead of throwing. Wrap every `mutationFn`/`queryFn` call with `unwrapAction()` from `lib/query-utils.ts` so TanStack Query's `onError`/retry actually fires.
- The `QueryClient` lives once at the root layout (`app/providers.tsx`). Never create another one inside a page/component — it gets torn down on route change and wipes the cache.
- After a mutation changes data another query already has cached (e.g. editing an album's photos while the canvas gallery card caches its preview), call `queryClient.invalidateQueries` for that key. Don't rely on a manual refetch-and-setState.
- Widget canvas layout is stored in the `widgets` table — **one row per widget** (`lib/actions/widgets.ts`). Never reintroduce a single-JSONB-array-per-user design; reposition/resize/create/delete must each touch only the one row involved.
- Every schema change: `npx drizzle-kit generate`, then apply with `npm run db:migrate`. Never hand-edit an already-applied migration file.
- After any non-trivial change: `rm -rf .next && npx tsc --noEmit`, `npx eslint app components lib tests`, `npx vitest run`, `timeout 150 npx next build`. All four must pass clean before considering the work done.
- No comments unless explaining a genuinely non-obvious WHY (a workaround, a hidden constraint). Never explain WHAT the code does.
