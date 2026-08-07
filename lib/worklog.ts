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


/** Toggle task completion status */
export async function toggleEntryCompletion(
  id: string,
  completed: boolean,
): Promise<EntryRow> {
  const [updated] = await db
    .update(entries)
    .set({
      completed,
      completedAt: completed ? sql`now()` : null,
      updatedAt: sql`now()`,
    })
    .where(and(eq(entries.id, id), isNull(entries.deletedAt)))
    .returning();

  if (!updated) {
    throw new WorklogError(`Entry not found: ${id}`);
  }

  return updated;
}

/** Move a log entry to a different section column */
export async function moveEntryToSection(
  id: string,
  sectionName: string,
): Promise<EntryRow> {
  const trimmedSection = sectionName.trim();
  await createSection(trimmedSection);

  const [updated] = await db
    .update(entries)
    .set({
      sectionName: trimmedSection,
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
  project?: Project | string;
  category?: Category[];
  title?: string;
  summary: string;
  sectionName?: string;
  date?: string;
}): Promise<EntryRow> {
  if (isFillerSummary(input.summary)) {
    throw new WorklogError(
      "Summary is too short or too generic. Be specific about what was done.",
    );
  }

  const entryDate = input.date ?? todayIST();
  const dedupedCategory = Array.from(new Set(input.category ?? ["general" as Category]));
  const projectVal = (input.project as Project) ?? "General";
  
  // If sectionName is omitted, default to "Today" for today's date, or date string e.g. "2026-08-05" for other dates
  let sectionVal = input.sectionName?.trim();
  if (!sectionVal) {
    if (entryDate === todayIST()) {
      sectionVal = "Today";
    } else {
      sectionVal = entryDate;
    }
  }

  const titleVal = input.title?.trim() || input.summary.split("\n")[0].slice(0, 80);

  // Auto-create section if it doesn't exist yet
  await createSection(sectionVal, entryDate);

  const [row] = await db
    .insert(entries)
    .values({
      date: entryDate,
      project: projectVal,
      category: dedupedCategory,
      title: titleVal,
      summary: input.summary.trim(),
      sectionName: sectionVal,
      completed: false,
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

export type SectionWithEntries = SectionRow & {
  entries: EntryRow[];
};

export async function getBoardData(options?: {
  filterToday?: boolean;
  date?: string;
  search?: string;
  project?: string;
}): Promise<{
  sections: SectionWithEntries[];
  allSectionList: SectionRow[];
}> {
  const allSections = await getSections();

  const conditions = [isNull(entries.deletedAt)];
  if (options?.filterToday) {
    conditions.push(eq(entries.date, todayIST()));
  }
  if (options?.date && options.date.trim() !== "") {
    conditions.push(eq(entries.date, options.date.trim()));
  }
  if (options?.project && options.project !== "all") {
    conditions.push(eq(entries.project, options.project));
  }
  if (options?.search && options.search.trim() !== "") {
    const term = `%${options.search.trim()}%`;
    const searchCond = or(
      ilike(entries.summary, term),
      ilike(entries.project, term),
      ilike(entries.sectionName, term),
    );
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
  allSections.forEach((s) => sectionMap.set(s.name, []));

  allEntries.forEach((entry) => {
    const sName = entry.sectionName || "My Tasks";
    if (!sectionMap.has(sName)) {
      sectionMap.set(sName, []);
    }
    sectionMap.get(sName)!.push(entry);
  });

  const resultSections: SectionWithEntries[] = [];

  allSections.forEach((s) => {
    resultSections.push({
      ...s,
      entries: sectionMap.get(s.name) || [],
    });
    sectionMap.delete(s.name);
  });

  sectionMap.forEach((entryList, name) => {
    resultSections.push({
      id: name,
      name,
      date: null,
      order: 999,
      createdAt: new Date(),
      updatedAt: new Date(),
      entries: entryList,
    });
  });

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

