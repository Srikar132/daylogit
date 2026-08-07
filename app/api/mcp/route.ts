import { createMcpHandler, withMcpAuth } from "mcp-handler";
import { z } from "zod";
import { verifyApiKey } from "@/lib/auth";
import { todayIST } from "@/lib/date";
import {
  createOrAppendEntry,
  createSection,
  getSectionsForDate,
  getTodayEntries,
  previewSummary,
  searchEntries,
  softDeleteEntry,
  updateEntry,
  updateSection,
} from "@/lib/worklog";

const handler = createMcpHandler(
  (server) => {
    server.registerTool(
      "get_sections",
      {
        title: "Get worklog sections/lists for a date",
        description:
          "Returns the sections that exist for one date (defaults to today, IST). " +
          "Sections are unique per date — the same name on two different dates is two separate sections.",
        inputSchema: {
          date: z
            .string()
            .regex(/^\d{4}-\d{2}-\d{2}$/)
            .optional()
            .describe("YYYY-MM-DD, defaults to today in IST"),
        },
      },
      async ({ date }) => {
        const targetDate = date || todayIST();
        const sectionsList = await getSectionsForDate(targetDate);
        if (sectionsList.length === 0) {
          return {
            content: [
              { type: "text", text: `No sections exist yet for ${targetDate}.` },
            ],
          };
        }
        const textList = sectionsList
          .map((s) => `- [id: ${s.id}] '${s.name}'`)
          .join("\n");
        return {
          content: [
            {
              type: "text",
              text: `Sections for ${targetDate} (${sectionsList.length}):\n${textList}`,
            },
          ],
        };
      },
    );

    server.registerTool(
      "create_section",
      {
        title: "Create a worklog section",
        description:
          "Creates a new section (list column) in DayLog for one date (defaults to today, IST). " +
          "Sections are always scoped to a date — the same name on a different date creates a distinct section.",
        inputSchema: {
          name: z
            .string()
            .describe("Name/title of the section e.g. My Tasks, Sprint Notes"),
          date: z
            .string()
            .regex(/^\d{4}-\d{2}-\d{2}$/)
            .optional()
            .describe("YYYY-MM-DD, defaults to today in IST"),
        },
      },
      async ({ name, date }) => {
        const sec = await createSection(name, date || todayIST());
        return {
          content: [
            {
              type: "text",
              text: `Section '${sec.name}' [id: ${sec.id}] created for ${sec.date}.`,
            },
          ],
        };
      },
    );

    server.registerTool(
      "update_section",
      {
        title: "Update section title",
        description: "Renames/updates a section title using section id or section name.",
        inputSchema: {
          id: z.string().describe("Section id or current section name"),
          name: z.string().describe("New title for the section"),
        },
      },
      async ({ id, name }) => {
        const sec = await updateSection(id, name);
        return {
          content: [
            {
              type: "text",
              text: `Section updated to '${sec.name}' [id: ${sec.id}].`,
            },
          ],
        };
      },
    );

    server.registerTool(
      "create_or_append_entry",
      {
        title: "Log work entry",
        description:
          "Create a worklog entry on a given date (defaults to today in IST). " +
          "If section is omitted, automatically creates/uses the default section for today ('My Tasks'). " +
          "Can also log directly into a specific section by sectionId or section name.",
        inputSchema: {
          title: z.string().optional().describe("Title of the log entry"),
          summary: z
            .string()
            .describe(
              "Specific description/details of work done. Generic filler like 'worked on stuff' is rejected.",
            ),
          sectionId: z
            .string()
            .optional()
            .describe("Optional section ID to log into"),
          section: z
            .string()
            .optional()
            .describe("Optional section name where task should be added (defaults to 'My Tasks')"),
          date: z
            .string()
            .regex(/^\d{4}-\d{2}-\d{2}$/)
            .optional()
            .describe("YYYY-MM-DD, defaults to today in IST"),
        },
      },
      async ({ title, summary, sectionId, section, date }) => {
        const row = await createOrAppendEntry({
          title,
          summary,
          sectionId,
          sectionName: section,
          date,
        });
        return {
          content: [
            {
              type: "text",
              text: `Logged [id: ${row.id}] in section [sectionId: ${row.sectionId}] on ${row.date}.`,
            },
          ],
        };
      },
    );

    server.registerTool(
      "update_entry",
      {
        title: "Update worklog entry",
        description: "Updates details or title of an existing log entry by entry id.",
        inputSchema: {
          id: z.string().describe("Entry UUID"),
          title: z.string().optional().describe("Updated log title"),
          summary: z.string().optional().describe("Updated log summary/details"),
        },
      },
      async ({ id, title, summary }) => {
        const updated = await updateEntry(id, {
          title,
          summary,
        });
        return {
          content: [
            {
              type: "text",
              text: `Updated entry [id: ${updated.id}] on ${updated.date}.`,
            },
          ],
        };
      },
    );

    server.registerTool(
      "get_today",
      {
        title: "Get today's worklog",
        description:
          "Returns all worklog entries for today (IST).",
        inputSchema: {},
      },
      async () => {
        const { date, rows } = await getTodayEntries();

        if (rows.length === 0) {
          return {
            content: [
              { type: "text", text: `No entries logged yet today (${date}).` },
            ],
          };
        }

        const text = rows
          .map(
            (row) =>
              `[id: ${row.id}] ${row.title ? `${row.title} - ` : ""}${row.summary}`,
          )
          .join("\n\n");

        return {
          content: [
            {
              type: "text",
              text: `Today (${date}) — ${rows.length} entry/entries logged:\n\n${text}`,
            },
          ],
        };
      },
    );

    server.registerTool(
      "search_entries",
      {
        title: "Search worklog entries",
        description:
          "Search worklog entries by date range. Always paginated.",
        inputSchema: {
          from: z
            .string()
            .regex(/^\d{4}-\d{2}-\d{2}$/)
            .optional(),
          to: z
            .string()
            .regex(/^\d{4}-\d{2}-\d{2}$/)
            .optional(),
          limit: z.number().int().min(1).max(100).default(20),
          offset: z.number().int().min(0).default(0),
        },
      },
      async ({ from, to, limit, offset }) => {
        const { rows } = await searchEntries({
          from,
          to,
          limit,
          offset,
        });

        if (rows.length === 0) {
          return { content: [{ type: "text", text: "No matching entries." }] };
        }

        const text = rows
          .map(
            (row) =>
              `[id: ${row.id}] ${row.date} — ${row.title ? `${row.title} - ` : ""}${previewSummary(row.summary)}`,
          )
          .join("\n\n");

        return {
          content: [
            {
              type: "text",
              text: `${rows.length} entr${rows.length === 1 ? "y" : "ies"} (offset ${offset}):\n\n${text}`,
            },
          ],
        };
      },
    );

    server.registerTool(
      "delete_entry",
      {
        title: "Delete worklog entry",
        description: "Soft-deletes a worklog entry by id.",
        inputSchema: {
          id: z.string().describe("Entry UUID to delete"),
        },
      },
      async ({ id }) => {
        const row = await softDeleteEntry(id);

        if (!row) {
          return {
            content: [
              { type: "text", text: `No active entry found with id ${id}.` },
            ],
          };
        }

        return {
          content: [
            {
              type: "text",
              text: `Deleted entry [id: ${row.id}] on ${row.date}.`,
            },
          ],
        };
      },
    );
  },
  {},
  { basePath: "/api", disableSse: true },
);

const authHandler = withMcpAuth(handler, verifyApiKey, {
  required: true,
});

export { authHandler as GET, authHandler as POST, authHandler as DELETE };
