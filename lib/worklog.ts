import { and, asc, count, desc, eq, gte, ilike, isNull, lte, or, sql } from "drizzle-orm";
import { db, entries, sections } from "@/lib/db";
import { addDaysIST, todayIST } from "@/lib/date";
import { isFillerSummary, type Category, type Project } from "@/lib/constants";

export type EntryRow = typeof entries.$inferSelect;
export type SectionRow = typeof sections.$inferSelect;

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
  "id" | "title" | "sectionId" | "date" | "createdAt" | "updatedAt"
>;

const SUMMARY_PREVIEW_LENGTH = 200;
const DASHBOARD_WINDOW_DAYS = 30;

export class WorklogError extends Error {}

/** Get every section that has ever been created, across all dates. */
export async function getSections(): Promise<SectionRow[]> {
  return db
    .select()
    .from(sections)
    .orderBy(asc(sections.order), asc(sections.createdAt));
}

/** Get sections scoped to one specific date only — never leaks another date's rows. */
export async function getSectionsForDate(date: string): Promise<SectionRow[]> {
  return db
    .select()
    .from(sections)
    .where(eq(sections.date, date))
    .orderBy(asc(sections.order), asc(sections.createdAt));
}

/**
 * Create a section, scoped to a date. Dedupes on (name, date) — the same name
 * on two different dates is two distinct rows, never the same shared row.
 * `date` always defaults to today: sections are never dateless/global going forward.
 */
export async function createSection(name: string, date?: string): Promise<SectionRow> {
  const trimmed = name.trim();
  if (!trimmed) {
    throw new WorklogError("Section name cannot be empty.");
  }
  const targetDate = date?.trim() || todayIST();

  const existing = await db
    .select()
    .from(sections)
    .where(and(eq(sections.name, trimmed), eq(sections.date, targetDate)))
    .limit(1);

  if (existing.length > 0) {
    return existing[0];
  }

  const dateSections = await db
    .select()
    .from(sections)
    .where(eq(sections.date, targetDate));
  const maxOrder = dateSections.reduce((max, s) => Math.max(max, s.order), 0);

  const [created] = await db
    .insert(sections)
    .values({
      name: trimmed,
      date: targetDate,
      order: maxOrder + 1,
    })
    .returning();

  return created;
}

/** Update section title by id or current name */
export async function updateSection(
  idOrName: string,
  newName: string,
): Promise<SectionRow> {
  const trimmedNewName = newName.trim();
  if (!trimmedNewName) {
    throw new WorklogError("New section title cannot be empty.");
  }

  const isUuid =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      idOrName.trim(),
    );

  let existing: SectionRow | undefined;

  if (isUuid) {
    const [row] = await db
      .select()
      .from(sections)
      .where(eq(sections.id, idOrName.trim()))
      .limit(1);
    existing = row;
  }

  if (!existing) {
    const [row] = await db
      .select()
      .from(sections)
      .where(eq(sections.name, idOrName.trim()))
      .limit(1);
    existing = row;
  }

  if (!existing) {
    throw new WorklogError(`Section not found: ${idOrName}`);
  }

  const [updated] = await db
    .update(sections)
    .set({
      name: trimmedNewName,
      updatedAt: sql`now()`,
    })
    .where(eq(sections.id, existing.id))
    .returning();

  return updated;
}

/** Move a log entry to a different section column */
export async function moveEntryToSection(
  id: string,
  targetSection: string,
): Promise<EntryRow> {
  const trimmed = targetSection.trim();
  let targetSec: SectionRow | undefined;

  const isUuid =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      trimmed,
    );

  if (isUuid) {
    const [row] = await db
      .select()
      .from(sections)
      .where(eq(sections.id, trimmed))
      .limit(1);
    if (!row) {
      throw new WorklogError(`Section not found: ${trimmed}`);
    }
    targetSec = row;
  } else {
    // Not a UUID — treat it as a section name to create/find (only reachable
    // from callers that pass a name directly, e.g. MCP tools; the board's
    // drag-and-drop always passes a real section id).
    targetSec = await createSection(trimmed);
  }

  const [updated] = await db
    .update(entries)
    .set({
      sectionId: targetSec.id,
      updatedAt: sql`now()`,
    })
    .where(and(eq(entries.id, id), isNull(entries.deletedAt)))
    .returning();

  if (!updated) {
    throw new WorklogError(`Entry not found: ${id}`);
  }

  return updated;
}

/** Create a new independent log entry row (no merging, no upsert). */
export async function createOrAppendEntry(input: {
  title?: string;
  summary: string;
  sectionId?: string;
  sectionName?: string;
  date?: string;
}): Promise<EntryRow> {
  if (isFillerSummary(input.summary)) {
    throw new WorklogError(
      "Summary is too short or too generic. Be specific about what was done.",
    );
  }

  const entryDate = input.date ?? todayIST();
  let secRow: SectionRow | undefined;

  if (input.sectionId) {
    const trimmedId = input.sectionId.trim();
    const isUuid =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        trimmedId,
      );
    if (!isUuid) {
      throw new WorklogError(`Invalid section id: ${trimmedId}`);
    }
    const [found] = await db
      .select()
      .from(sections)
      .where(eq(sections.id, trimmedId))
      .limit(1);
    if (!found) {
      throw new WorklogError(`Section not found: ${trimmedId}`);
    }
    secRow = found;
  } else {
    const sName = input.sectionName?.trim() || "My Tasks";
    secRow = await createSection(sName, entryDate);
  }

  const titleVal = input.title?.trim() || input.summary.split("\n")[0].slice(0, 80);

  const [row] = await db
    .insert(entries)
    .values({
      date: entryDate,
      title: titleVal,
      summary: input.summary.trim(),
      sectionId: secRow.id,
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
    .orderBy(desc(entries.createdAt));

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

export async function searchEntries(input: {
  from?: string;
  to?: string;
  limit?: number;
  offset?: number;
}): Promise<{ rows: EntryRow[]; limit: number; offset: number }> {
  const limit = Math.min(input.limit ?? 20, 100);
  const offset = input.offset ?? 0;

  const conditions = [isNull(entries.deletedAt)];
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
    title?: string;
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
      ...(patch.title !== undefined && { title: patch.title.trim() }),
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

export type SectionWithEntries = SectionRow & {
  entries: EntryListItem[];
};

/**
 * Board for exactly one date. Sections are fetched strictly by their own
 * `date` column — never by name, never a global list — so a section shown
 * here is always physically scoped to this date. No section is ever
 * auto-created here; a date with none simply returns an empty list.
 */
export async function getBoardData(options: {
  date: string;
  search?: string;
}): Promise<{
  sections: SectionWithEntries[];
}> {
  const targetDate = options.date.trim();

  const dateSections = await getSectionsForDate(targetDate);

  const conditions = [isNull(entries.deletedAt), eq(entries.date, targetDate)];
  if (options.search && options.search.trim() !== "") {
    // Filtering still matches against the full summary text even though it's
    // not part of the selected columns below — Postgres can reference a
    // column in WHERE without it being in SELECT.
    const searchCond = ilike(entries.summary, `%${options.search.trim()}%`);
    if (searchCond) {
      conditions.push(searchCond);
    }
  }

  const dateEntries: EntryListItem[] = await db
    .select({
      id: entries.id,
      title: entries.title,
      sectionId: entries.sectionId,
      date: entries.date,
      createdAt: entries.createdAt,
      updatedAt: entries.updatedAt,
    })
    .from(entries)
    .where(and(...conditions))
    .orderBy(asc(entries.createdAt));

  const sectionMap = new Map<string, EntryListItem[]>();
  dateSections.forEach((s) => sectionMap.set(s.id, []));

  dateEntries.forEach((entry) => {
    if (entry.sectionId && sectionMap.has(entry.sectionId)) {
      sectionMap.get(entry.sectionId)!.push(entry);
    }
  });

  const resultSections: SectionWithEntries[] = dateSections.map((s) => ({
    ...s,
    entries: sectionMap.get(s.id) || [],
  }));

  return { sections: resultSections };
}

/** Full row (summary included) for the detail dialog — fetched lazily by id, never bulk. */
export async function getEntryById(id: string): Promise<EntryRow | undefined> {
  const [row] = await db
    .select()
    .from(entries)
    .where(and(eq(entries.id, id), isNull(entries.deletedAt)))
    .limit(1);

  return row;
}

/** Delete a section — refuses if it still has any active (non-deleted) entries. */
export async function deleteSection(id: string): Promise<void> {
  const [row] = await db
    .select({ value: count() })
    .from(entries)
    .where(and(eq(entries.sectionId, id), isNull(entries.deletedAt)));

  if (Number(row?.value ?? 0) > 0) {
    throw new WorklogError("Section is not empty — move or remove its logs first.");
  }

  const deleted = await db.delete(sections).where(eq(sections.id, id)).returning();

  if (deleted.length === 0) {
    throw new WorklogError(`Section not found: ${id}`);
  }
}

export async function updateSectionOrder(
  orders: { id: string; order: number }[],
): Promise<void> {
  for (const item of orders) {
    await db
      .update(sections)
      .set({ order: item.order, updatedAt: sql`now()` })
      .where(eq(sections.id, item.id));
  }
}

