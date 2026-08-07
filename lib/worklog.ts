import { and, asc, count, desc, eq, gte, ilike, isNull, lte, or, sql } from "drizzle-orm";
import { db, entries, sections } from "@/lib/db";
import { addDaysIST, todayIST } from "@/lib/date";
import { isFillerSummary, type Category, type Project } from "@/lib/constants";

export type EntryRow = typeof entries.$inferSelect;
export type SectionRow = typeof sections.$inferSelect;

const SUMMARY_PREVIEW_LENGTH = 200;
const DASHBOARD_WINDOW_DAYS = 30;

export class WorklogError extends Error {}

/** Get all defined sections, ensuring default sections exist if empty. */
export async function getSections(): Promise<SectionRow[]> {
  try {
    const rows = await db
      .select()
      .from(sections)
      .orderBy(asc(sections.order), asc(sections.createdAt));

    if (rows.length === 0) {
      const defaultSections = [
        { name: "My Logs", order: 0 },
      ];
      const created = await db
        .insert(sections)
        .values(defaultSections)
        .returning();
      return created;
    }

    return rows;
  } catch (e) {
    console.error("Failed to query sections table, using fallback:", e);
    return [
      { id: "s1", name: "My Logs", date: null, order: 0, createdAt: new Date(), updatedAt: new Date() },
    ];
  }
}



/** Create a new section (list) */
export async function createSection(name: string, date?: string): Promise<SectionRow> {
  const trimmed = name.trim();
  if (!trimmed) {
    throw new WorklogError("Section name cannot be empty.");
  }

  try {
    const existing = await db
      .select()
      .from(sections)
      .where(eq(sections.name, trimmed))
      .limit(1);

    if (existing.length > 0) {
      return existing[0];
    }

    const allSections = await db.select().from(sections);
    const maxOrder = allSections.reduce((max, s) => Math.max(max, s.order), 0);

    const [created] = await db
      .insert(sections)
      .values({
        name: trimmed,
        date: date ?? null,
        order: maxOrder + 1,
      })
      .returning();

    return created;
  } catch (e) {
    console.error("Failed to create section in database table:", e);
    return {
      id: trimmed.toLowerCase().replace(/\s+/g, "-"),
      name: trimmed,
      date: date ?? null,
      order: 99,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }
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
    targetSec = row;
  }

  if (!targetSec) {
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
    const isUuid =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        input.sectionId.trim(),
      );
    if (isUuid) {
      const [found] = await db
        .select()
        .from(sections)
        .where(eq(sections.id, input.sectionId.trim()))
        .limit(1);
      secRow = found;
    }
  }

  if (!secRow) {
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
  entries: EntryRow[];
};

export async function getBoardData(options?: {
  filterToday?: boolean;
  date?: string;
  search?: string;
}): Promise<{
  sections: SectionWithEntries[];
  allSectionList: SectionRow[];
}> {
  const allSections = await getSections();

  const conditions = [isNull(entries.deletedAt)];
  const targetDateFilter = options?.date?.trim() || (options?.filterToday ? todayIST() : undefined);
  if (targetDateFilter) {
    conditions.push(eq(entries.date, targetDateFilter));
  }
  if (options?.search && options.search.trim() !== "") {
    const term = `%${options.search.trim()}%`;
    const searchCond = ilike(entries.summary, term);
    if (searchCond) {
      conditions.push(searchCond);
    }
  }

  const allEntries = await db
    .select()
    .from(entries)
    .where(and(...conditions))
    .orderBy(asc(entries.createdAt));

  const sectionMap = new Map<string, EntryRow[]>();
  allSections.forEach((s) => sectionMap.set(s.id, []));

  allEntries.forEach((entry) => {
    const sId = entry.sectionId;
    if (sId && sectionMap.has(sId)) {
      sectionMap.get(sId)!.push(entry);
    } else if (allSections.length > 0) {
      // Fallback to first section if unlinked
      sectionMap.get(allSections[0].id)!.push(entry);
    }
  });

  let resultSections: SectionWithEntries[] = [];

  allSections.forEach((s) => {
    resultSections.push({
      ...s,
      entries: sectionMap.get(s.id) || [],
    });
  });

  // When viewing today or a specific date, filter sections so yesterday's sections are hidden
  const isFilteredByDate = Boolean(options?.filterToday || options?.date);
  const targetDate = options?.date?.trim() || (options?.filterToday ? todayIST() : undefined);

  if (isFilteredByDate && targetDate) {
    resultSections = resultSections.filter((sec) => {
      // Keep section if it has entries for this date, or if it matches the target date or name
      if (sec.entries.length > 0) return true;
      if (sec.date === targetDate) return true;
      if (sec.name === "My Tasks" || sec.name === "Today") return true;
      if (sec.name === `Logs for ${targetDate}`) return true;
      return false;
    });

    // If no section exists for today yet, ensure a clean "My Tasks" section is returned
    if (resultSections.length === 0) {
      const defaultSecName = "My Tasks";
      const createdSec = await createSection(defaultSecName, targetDate);
      resultSections = [
        {
          ...createdSec,
          entries: [],
        },
      ];
    }
  }

  return {
    sections: resultSections,
    allSectionList: allSections,
  };
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

