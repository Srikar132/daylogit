import { and, count, desc, eq, gte, ilike, isNull, lte, or, sql } from "drizzle-orm";
import { db, entries } from "@/lib/db";
import { addDaysIST, todayIST } from "@/lib/date";
import { isFillerSummary, type Category, type Project } from "@/lib/constants";

export type EntryRow = typeof entries.$inferSelect;

const SUMMARY_PREVIEW_LENGTH = 200;
const DASHBOARD_WINDOW_DAYS = 30;

export class WorklogError extends Error {}

/** Create a new independent log entry row (no merging, no upsert). */
export async function createOrAppendEntry(input: {
  project: Project;
  category: Category[];
  summary: string;
  date?: string;
}): Promise<EntryRow> {
  if (isFillerSummary(input.summary)) {
    throw new WorklogError(
      "Summary is too short or too generic. Be specific about what was done.",
    );
  }

  const entryDate = input.date ?? todayIST();
  const dedupedCategory = Array.from(new Set(input.category));

  const [row] = await db
    .insert(entries)
    .values({
      date: entryDate,
      project: input.project,
      category: dedupedCategory,
      summary: input.summary.trim(),
    })
    .returning();

  return row;
}

export async function getTodayEntries(): Promise<{
  date: string;
  rows: EntryRow[];
}> {
  const date = todayIST();
  const rows = await db
    .select()
    .from(entries)
    .where(and(eq(entries.date, date), isNull(entries.deletedAt)))
    .orderBy(entries.project);

  return { date, rows };
}

/** Rows for the dashboard's default view — last 30 days, most recent first. */
export async function getRecentEntries(): Promise<EntryRow[]> {
  const cutoff = addDaysIST(todayIST(), -DASHBOARD_WINDOW_DAYS);

  return db
    .select()
    .from(entries)
    .where(and(isNull(entries.deletedAt), gte(entries.date, cutoff)))
    .orderBy(desc(entries.updatedAt), desc(entries.date));
}

/** Paginated entries for server-side dashboard table view (latest first). */
export async function getPaginatedEntries(options?: {
  page?: number;
  pageSize?: number;
  search?: string;
  project?: string;
  filterToday?: boolean;
  date?: string;
}): Promise<{
  entries: EntryRow[];
  totalCount: number;
  totalPages: number;
  page: number;
  pageSize: number;
}> {
  const page = Math.max(1, options?.page ?? 1);
  const pageSize = Math.max(1, Math.min(100, options?.pageSize ?? 10));
  const offset = (page - 1) * pageSize;

  const conditions = [isNull(entries.deletedAt)];

  if (options?.project && options.project !== "all") {
    conditions.push(eq(entries.project, options.project));
  }

  if (options?.filterToday) {
    conditions.push(eq(entries.date, todayIST()));
  }

  if (options?.date && options.date.trim() !== "") {
    conditions.push(eq(entries.date, options.date.trim()));
  }

  if (options?.search && options.search.trim() !== "") {
    const searchTrimmed = options.search.trim();
    const term = `%${searchTrimmed}%`;
    const searchCondition = or(
      ilike(entries.summary, term),
      ilike(entries.project, term),
      ilike(sql<string>`${entries.date}::text`, term),
      ilike(sql<string>`to_char(${entries.date}, 'DD Mon YYYY Month')`, term),
    );
    if (searchCondition) {
      conditions.push(searchCondition);
    }
  }

  const whereClause = and(...conditions);

  const [countResult] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(entries)
    .where(whereClause);

  const totalCount = Number(countResult?.count ?? 0);
  const totalPages = Math.ceil(totalCount / pageSize) || 1;

  const rows = await db
    .select()
    .from(entries)
    .where(whereClause)
    .orderBy(desc(entries.updatedAt), desc(entries.createdAt), desc(entries.date))
    .limit(pageSize)
    .offset(offset);

  return {
    entries: rows,
    totalCount,
    totalPages,
    page,
    pageSize,
  };
}

export async function searchEntries(input: {
  project?: Project;
  from?: string;
  to?: string;
  limit?: number;
  offset?: number;
}): Promise<{ rows: EntryRow[]; limit: number; offset: number }> {
  const limit = Math.min(input.limit ?? 20, 100);
  const offset = input.offset ?? 0;

  const conditions = [isNull(entries.deletedAt)];
  if (input.project) conditions.push(eq(entries.project, input.project));
  if (input.from) conditions.push(gte(entries.date, input.from));
  if (input.to) conditions.push(lte(entries.date, input.to));

  const rows = await db
    .select()
    .from(entries)
    .where(and(...conditions))
    .orderBy(desc(entries.date))
    .limit(limit)
    .offset(offset);

  return { rows, limit, offset };
}

/** Truncates a summary for list/search views. */
export function previewSummary(summary: string): string {
  return summary.length > SUMMARY_PREVIEW_LENGTH
    ? `${summary.slice(0, SUMMARY_PREVIEW_LENGTH)}…`
    : summary;
}

export async function softDeleteEntry(
  id: string,
): Promise<EntryRow | undefined> {
  const [row] = await db
    .update(entries)
    .set({ deletedAt: sql`now()` })
    .where(and(eq(entries.id, id), isNull(entries.deletedAt)))
    .returning();

  return row;
}

export async function updateEntry(
  id: string,
  patch: {
    project?: Project;
    category?: Category[];
    summary?: string;
  },
): Promise<EntryRow> {
  if (patch.summary !== undefined && isFillerSummary(patch.summary)) {
    throw new WorklogError(
      "Summary is too short or too generic. Be specific about what was done.",
    );
  }

  const [row] = await db
    .update(entries)
    .set({
      ...(patch.project !== undefined && { project: patch.project }),
      ...(patch.category !== undefined && {
        category: Array.from(new Set(patch.category)),
      }),
      ...(patch.summary !== undefined && { summary: patch.summary.trim() }),
      updatedAt: sql`now()`,
    })
    .where(and(eq(entries.id, id), isNull(entries.deletedAt)))
    .returning();

  if (!row) {
    throw new WorklogError(`No active entry found with id ${id}.`);
  }

  return row;
}
