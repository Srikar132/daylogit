import { and, asc, desc, eq, gte, ilike, inArray, isNull, lte, or, sql } from "drizzle-orm";
import { db, entries, type TaskStatus } from "@/lib/db";
import { addDaysIST, todayIST } from "@/lib/date";
import { isFillerSummary, type WorkType } from "@/lib/constants";

export type EntryRow = typeof entries.$inferSelect;

/**
 * Everything the board's list view needs to render a row — deliberately
 * WITHOUT `summary`. The board renders titles only; the full row (summary
 * included) is fetched lazily, on demand, by `getEntryById` when the detail
 * dialog opens for one specific entry. Keeps the board query's cost flat
 * regardless of how long individual summaries get or how many entries a
 * date accumulates.
 */
export type EntryListItem = Pick<
  EntryRow,
  "id" | "title" | "status" | "workType" | "dueDate" | "date" | "createdAt" | "updatedAt" | "authorId"
>;

const SUMMARY_PREVIEW_LENGTH = 200;
const DASHBOARD_WINDOW_DAYS = 30;

export class EntryError extends Error {}

/** Create a new independent log entry row (no merging, no upsert). Lands in "todo"/"task" unless given. */
export async function createOrAppendEntry(
  organizationId: string,
  authorId: string,
  input: {
    title?: string;
    summary: string;
    status?: TaskStatus;
    workType?: WorkType;
    dueDate?: string;
    date?: string;
  },
): Promise<EntryRow> {
  if (isFillerSummary(input.summary)) {
    throw new EntryError(
      "Summary is too short or too generic. Be specific about what was done.",
    );
  }

  const entryDate = input.date ?? todayIST();
  const titleVal = input.title?.trim() || input.summary.split("\n")[0].slice(0, 80);

  const [row] = await db
    .insert(entries)
    .values({
      date: entryDate,
      title: titleVal,
      summary: input.summary.trim(),
      status: input.status ?? "todo",
      workType: input.workType ?? "task",
      dueDate: input.dueDate,
      organizationId,
      authorId,
    })
    .returning();

  return row;
}

export async function getTodayEntries(organizationId: string): Promise<{
  date: string;
  rows: EntryRow[];
}> {
  const date = todayIST();
  const rows = await db
    .select()
    .from(entries)
    .where(
      and(
        eq(entries.organizationId, organizationId),
        eq(entries.date, date),
        isNull(entries.deletedAt),
      ),
    )
    .orderBy(desc(entries.createdAt));

  return { date, rows };
}

/** Rows for the dashboard's default view — last 30 days, most recent first. */
export async function getRecentEntries(organizationId: string): Promise<EntryRow[]> {
  const cutoff = addDaysIST(todayIST(), -DASHBOARD_WINDOW_DAYS);

  return db
    .select()
    .from(entries)
    .where(
      and(
        eq(entries.organizationId, organizationId),
        isNull(entries.deletedAt),
        gte(entries.date, cutoff),
      ),
    )
    .orderBy(desc(entries.updatedAt), desc(entries.date));
}

/** Paginated entries for server-side dashboard table view (latest first). */
export async function getPaginatedEntries(
  organizationId: string,
  options?: {
    page?: number;
    pageSize?: number;
    search?: string;
    filterToday?: boolean;
    date?: string;
  },
): Promise<{
  entries: EntryRow[];
  totalCount: number;
  totalPages: number;
  page: number;
  pageSize: number;
}> {
  const page = Math.max(1, options?.page ?? 1);
  const pageSize = Math.max(1, Math.min(100, options?.pageSize ?? 10));
  const offset = (page - 1) * pageSize;

  const conditions = [eq(entries.organizationId, organizationId), isNull(entries.deletedAt)];

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

export async function searchEntries(
  organizationId: string,
  input: {
    from?: string;
    to?: string;
    limit?: number;
    offset?: number;
  },
): Promise<{ rows: EntryRow[]; limit: number; offset: number }> {
  const limit = Math.min(input.limit ?? 20, 100);
  const offset = input.offset ?? 0;

  const conditions = [eq(entries.organizationId, organizationId), isNull(entries.deletedAt)];
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
  organizationId: string,
  id: string,
): Promise<EntryRow | undefined> {
  const [row] = await db
    .update(entries)
    .set({ deletedAt: sql`now()` })
    .where(
      and(
        eq(entries.id, id),
        eq(entries.organizationId, organizationId),
        isNull(entries.deletedAt),
      ),
    )
    .returning();

  return row;
}

export async function updateEntry(
  organizationId: string,
  id: string,
  patch: {
    title?: string;
    summary?: string;
  },
): Promise<EntryRow> {
  if (patch.summary !== undefined && isFillerSummary(patch.summary)) {
    throw new EntryError(
      "Summary is too short or too generic. Be specific about what was done.",
    );
  }

  const [row] = await db
    .update(entries)
    .set({
      ...(patch.title !== undefined && { title: patch.title.trim() }),
      ...(patch.summary !== undefined && { summary: patch.summary.trim() }),
      updatedAt: sql`now()`,
    })
    .where(
      and(
        eq(entries.id, id),
        eq(entries.organizationId, organizationId),
        isNull(entries.deletedAt),
      ),
    )
    .returning();

  if (!row) {
    throw new EntryError(`No active entry found with id ${id}.`);
  }

  return row;
}

/** Moves a task between the board's fixed status columns. */
export async function updateEntryStatus(
  organizationId: string,
  id: string,
  status: TaskStatus,
): Promise<EntryRow> {
  const [row] = await db
    .update(entries)
    .set({ status, updatedAt: sql`now()` })
    .where(
      and(
        eq(entries.id, id),
        eq(entries.organizationId, organizationId),
        isNull(entries.deletedAt),
      ),
    )
    .returning();

  if (!row) {
    throw new EntryError(`Entry not found: ${id}`);
  }

  return row;
}

export type BoardColumn = {
  status: TaskStatus;
  entries: EntryListItem[];
};

/** Board for one workspace, always exactly the three fixed status columns.
 *  With no `date`, every non-deleted entry across all dates is included —
 *  the board is a single unified view, not scoped to "today" by default. */
export async function getBoardData(
  organizationId: string,
  options: {
    date?: string;
    search?: string;
    workTypes?: WorkType[];
  },
): Promise<{ columns: BoardColumn[] }> {
  const conditions = [eq(entries.organizationId, organizationId), isNull(entries.deletedAt)];
  if (options.date && options.date.trim() !== "") {
    conditions.push(eq(entries.date, options.date.trim()));
  }
  if (options.workTypes && options.workTypes.length > 0) {
    conditions.push(inArray(entries.workType, options.workTypes));
  }
  if (options.search && options.search.trim() !== "") {
    // Filtering still matches against the full summary text even though it's
    // not part of the selected columns below — Postgres can reference a
    // column in WHERE without it being in SELECT.
    const searchCond = ilike(entries.summary, `%${options.search.trim()}%`);
    if (searchCond) {
      conditions.push(searchCond);
    }
  }

  const matchedEntries: EntryListItem[] = await db
    .select({
      id: entries.id,
      title: entries.title,
      status: entries.status,
      workType: entries.workType,
      dueDate: entries.dueDate,
      date: entries.date,
      authorId: entries.authorId,
      createdAt: entries.createdAt,
      updatedAt: entries.updatedAt,
    })
    .from(entries)
    .where(and(...conditions))
    .orderBy(asc(entries.createdAt));

  const byStatus = new Map<TaskStatus, EntryListItem[]>([
    ["todo", []],
    ["in_progress", []],
    ["completed", []],
  ]);

  matchedEntries.forEach((entry) => {
    byStatus.get(entry.status)?.push(entry);
  });

  return {
    columns: [
      { status: "todo", entries: byStatus.get("todo")! },
      { status: "in_progress", entries: byStatus.get("in_progress")! },
      { status: "completed", entries: byStatus.get("completed")! },
    ],
  };
}

/** Full row (summary included) for the detail dialog — fetched lazily by id, scoped to this workspace. */
export async function getEntryById(
  organizationId: string,
  id: string,
): Promise<EntryRow | undefined> {
  const [row] = await db
    .select()
    .from(entries)
    .where(
      and(
        eq(entries.id, id),
        eq(entries.organizationId, organizationId),
        isNull(entries.deletedAt),
      ),
    )
    .limit(1);

  return row;
}
