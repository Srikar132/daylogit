# CLAUDE.md — Worklog MCP Server + Dashboard

## What this project is

A self-hosted replacement for the Notion worklog. One Next.js app that does two jobs:

1. **MCP server** (`/api/mcp`) — lets Claude Code / Claude.ai create and query worklog
   entries mid-conversation ("log today", "what did I do today").
2. **Dashboard UI** (`/`) — a normal web page to browse, filter, and edit entries by
   hand, with no AI involved. Useful as a fallback and for a quick visual scan before
   a standup call.

Single user. No multi-tenant auth, no OAuth server, no user table. One static API key
protects the MCP endpoint. Keep it that simple — do not add accounts/roles/teams
unless explicitly asked.

---

## Tech stack (fixed — don't deviate without asking)

- **Framework:** Next.js 14+, App Router
- **DB:** Neon Postgres + Drizzle ORM
- **MCP:** `mcp-handler` (Vercel's official adapter) + `@modelcontextprotocol/sdk@1.26.0` + `zod`
- **UI rendering:** Server Components only. `app/page.tsx` fetches directly from
  `lib/db.ts` inside the server component — no `"use client"`, no `useEffect`, no
  TanStack Query, no client-side fetch to `/api/entries` for the initial render.
  Mark the page `export const dynamic = "force-dynamic"` so it's always
  server-rendered fresh on every request, with zero client JS needed just to read
  data. Reserve `"use client"` only for the smallest possible interactive leaf —
  e.g. a single filter dropdown — never wrap the whole page or list in a client
  boundary.
- **Mutations from the UI:** Server Actions (`"use server"` in `lib/actions.ts`)
  called directly from `<form action={...}>` — not a client-side fetch. The
  `/api/entries` REST route can still exist as a thin wrapper for any future
  external caller, but the dashboard itself must not depend on it.
- **Styling:** shadcn/ui primitives as a base, strict CSS variables for all
  color/spacing/radius tokens (no hardcoded hex in components) — but the result
  must not look like a shadcn default table. See "Dashboard UI design" below for
  the actual visual direction.
- **Deploy target:** Vercel (gives the public HTTPS URL the MCP endpoint needs)

---

## Folder structure

```
app/
  page.tsx                 → dashboard (list + filter entries)
  api/
    mcp/route.ts            → MCP server, tools live here
    entries/route.ts        → plain REST API the dashboard calls (GET/PATCH/DELETE)
lib/
  db.ts                     → Drizzle client + schema
  auth.ts                   → API key check helper
  date.ts                   → timezone-safe "today" helper (see Edge Cases)
```

---

## Dashboard UI design (`app/page.tsx`)

Do **not** build this as a plain data table (rows/columns of raw fields). Design it
as a clean, card/list-based day-log — closer to a polished task app than a database
viewer. Reference feel: dark theme, generous spacing, one clear list per section,
soft accent color for actions, a friendly empty state — not a dense grid.

Structure:

- **Header** — page title ("Worklog"), current date, a subtle secondary line (e.g.
  entry count today). No page-level client interactivity needed here.
- **Grouped by date, most recent first** — each date is its own section with a
  small heading (e.g. "Today", "Yesterday", "Jul 27"), not a flat list mixing dates.
- **Each entry as a card**, not a table row: project shown as a colored pill/badge
  (map project → a fixed accent color via CSS variable, e.g.
  `--project-rafttaar`, `--project-creonex`, etc.), category tags as small chips,
  and the summary as readable multi-line text — not truncated into one line.
- **Empty state** — when a date has zero entries, show a calm empty-state block
  (icon + short reassuring text), not a blank void or a bare "No data."
- **Visual hierarchy** — use type scale and spacing (via CSS variables) to separate
  date headings from card content; don't rely on borders/gridlines alone to
  separate rows the way a table does.
- **No pagination controls on the page itself for now** — cap the query (e.g. last
  30 days) server-side; add pagination only if asked.
- **Dark mode is default**, using the same CSS variable tokens shadcn/ui exposes
  (`--background`, `--foreground`, `--card`, `--muted`, `--accent`, etc.) — don't
  introduce a separate hardcoded dark palette outside those variables.

The goal: someone glancing at this page for 5 seconds should be able to tell what
was worked on today without parsing a table.

---

## Database schema (Drizzle)

```ts
export const entries = pgTable("entries", {
  id: uuid("id").defaultRandom().primaryKey(),
  date: date("date").notNull(), // store as DATE, not timestamp — see Edge Cases
  project: text("project").notNull(), // "Rafttaar" | "Creonex" | "BellCorps" | "Other"
  category: text("category").array().notNull(), // ["Code","Analysis","Meeting","Design","Debugging"]
  summary: text("summary").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
// One unique index to make upserts safe:
uniqueIndex("date_project_idx").on(entries.date, entries.project);
```

---

## MCP tools to implement (`app/api/mcp/route.ts`)

### `create_or_append_entry`

Input: `{ project, category[], summary, date? }` (date defaults to today, server-side).
Logic:

1. Look up existing row for `(date, project)` using the unique index.
2. If found → append `summary` as a new bullet to the existing text, merge
   `category` arrays (dedupe), update `updated_at`. **Never overwrite** past bullets.
3. If not found → insert new row.
   This single tool replaces "search then create" — do it atomically in one DB
   transaction to avoid a race between two rapid calls creating duplicate rows.

### `get_today`

No input. Returns all rows where `date = today` (server timezone-safe, see below),
across all projects, formatted as a short spoken-style summary — not raw JSON dumped
back to the user.

### `search_entries`

Input: `{ project?, from?, to?, limit? }`. Always require a `limit` (default 20, max 100) — never return unbounded rows (see token-limit edge case below).

### `delete_entry` (optional, only if you want undo capability)

Input: `{ id }`. Soft-delete (`deleted_at` column) rather than hard delete, so a bad
Claude tool-call can't silently destroy history.

---

## Auth

- One secret, e.g. `WORKLOG_API_KEY`, stored as a Vercel env var — never in code or git.
- Every MCP request must carry `Authorization: Bearer <key>`.
- Wrap the handler with `withMcpAuth` (from `mcp-handler`) and reject anything without
  a matching key with 401 — do this before touching the DB, not after.
- The dashboard UI's own `/api/entries` route is separate — protect it with a login
  cookie or simple middleware if you ever expose it publicly; if it's only ever run
  locally/behind Vercel preview auth, this can stay open.
- **Never** log the API key value, even in error messages or verbose logs.

---

## Edge cases — handle all of these explicitly

1. **"Today" is ambiguous across timezones.** The server likely runs in UTC; you're
   in IST. Always compute "today" using your fixed timezone (`Asia/Kolkata`), not
   `new Date()` on the server, or a 6pm session logs into tomorrow's date after UTC
   rolls over. Centralize this in `lib/date.ts`, never inline `new Date()` in tool code.

2. **Duplicate entries for the same day + project.** Handled by the unique index +
   upsert logic above — this is the most likely bug if skipped, since Claude may be
   invoked multiple times in one day for the same project.

3. **Empty or near-empty summaries.** Reject (`400`) summaries under ~10 characters
   or generic filler like "worked on stuff" — return an error asking the tool caller
   (Claude) to be specific, rather than silently storing a useless entry.

4. **Invalid `project` or `category` values.** Validate against a fixed enum with
   zod at the tool boundary. Reject unknown values rather than silently storing
   free text — this keeps filtering/reporting reliable later.

5. **Large result sets / token limits.** Custom MCP connectors have a response size
   ceiling (~30k tokens). `search_entries` must always paginate (`limit`/`offset`)
   and truncate summaries in list views — never return full history in one call.

6. **Concurrent writes.** If you ever call `/log` from two sessions close together,
   wrap the upsert in a DB transaction with `SELECT ... FOR UPDATE` or rely on the
   unique constraint + `ON CONFLICT DO UPDATE` — don't do read-then-write in two steps.

7. **Malformed/missing auth header.** Return a clean 401 with no stack trace or DB
   error detail leaked in the response body.

8. **Server cold starts / DB connection limits.** Neon + serverless functions can
   exhaust connections under bursty use — use Neon's pooled connection string
   (`-pooler` host), not the direct one, from Vercel.

9. **Clock drift between "session end" and "log time."** If a session runs past
   midnight IST, decide upfront: log against the date the session _started_, not
   when `/log` was called. State this explicitly in the tool description so Claude
   doesn't guess.

10. **Schema changes later.** If you add a field, write a Drizzle migration — never
    hand-edit the DB. Keep `drizzle/migrations` committed to git.

---

## What NOT to do

- Don't add OAuth, user accounts, or roles — single-user tool.
- Don't fetch data client-side on the dashboard (`useEffect`, TanStack Query, or a
  `fetch("/api/entries")` on mount) — the page must read straight from the DB as a
  Server Component.
- Don't wrap the whole page/list in `"use client"` just to make one filter
  interactive — isolate the client boundary to that one control.
- Don't render entries as a plain HTML `<table>` — use the card/list layout
  described in "Dashboard UI design."
- Don't return unbounded query results to Claude.
- Don't store the API key anywhere but env vars.
