import { createMcpHandler, withMcpAuth } from "mcp-handler";
import { z } from "zod";
import { verifyApiKey } from "@/lib/auth";
import { CATEGORIES, PROJECTS } from "@/lib/constants";
import {
  createOrAppendEntry,
  createSection,
  getSections,
  getTodayEntries,
  previewSummary,
  searchEntries,
  softDeleteEntry,
} from "@/lib/worklog";

const handler = createMcpHandler(
  (server) => {
    server.registerTool(
      "get_sections",
      {
        title: "Get worklog lists/sections",
        description: "Returns all active list sections in DayLog (e.g. 'My Logs', 'Creonex project') so you can pick which list to add logs to.",
        inputSchema: {},
      },
      async () => {
        const sectionsList = await getSections();
        const names = sectionsList.map((s) => s.name);
        return {
          content: [
            {
              type: "text",
              text: `Available lists (${names.length}):\n- ${names.join("\n- ")}`,
            },
          ],
        };
      },
    );

    server.registerTool(
      "create_section",
      {
        title: "Create a worklog section",
        description: "Creates a new section (list column) in DayLog, such as 'Today', 'Tomorrow', 'Creonex project', or any custom date/list title.",
        inputSchema: {
          name: z.string().describe("Name of the section e.g. Today, Tomorrow, Project X"),
          date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().describe("Optional date YYYY-MM-DD for date-bound section"),
        },
      },
      async ({ name, date }) => {
        const sec = await createSection(name, date);
        return {
          content: [
            {
              type: "text",
              text: `Section '${sec.name}' created successfully.`,
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
          "Create a worklog entry for a project/section on a given date (defaults to today, IST). " +
          "If section is omitted, today's logs automatically route to the 'Today' list section. " +
          "Logs for past or future dates (e.g. 2 or 3 days ago YYYY-MM-DD) automatically route into that date's section column.",
        inputSchema: {
          project: z.enum(PROJECTS).optional(),
          category: z.array(z.enum(CATEGORIES)).optional(),
          title: z.string().optional().describe("Title of the task/log entry"),
          summary: z
            .string()
            .describe(
              "Specific description of the work done. Generic filler like 'worked on stuff' is rejected.",
            ),
          section: z.string().optional().describe("Section/list name where task should be added (defaults to 'Today' or date e.g. YYYY-MM-DD)"),
          date: z
            .string()
            .regex(/^\d{4}-\d{2}-\d{2}$/)
            .optional()
            .describe("YYYY-MM-DD, defaults to today in IST"),
        },
      },

      async ({ project, category, title, summary, section, date }) => {
        const row = await createOrAppendEntry({
          project,
          category,
          title,
          summary,
          sectionName: section,
          date,
        });
        return {
          content: [
            {
              type: "text",
              text: `Logged for ${row.project} in section '${row.sectionName}' on ${row.date}.`,
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
          "Returns all worklog entries for today (IST), across all projects, as a short spoken-style summary.",
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
              `[id: ${row.id}] ${row.project} (${row.category.join(", ")}):\n${row.summary}`,
          )
          .join("\n\n");

        return {
          content: [
            {
              type: "text",
              text: `Today (${date}) — ${rows.length} project(s) logged:\n\n${text}`,
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
          "Search worklog entries by project and/or date range. Always paginated — never returns unbounded results.",
        inputSchema: {
          project: z.enum(PROJECTS).optional(),
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
      async ({ project, from, to, limit, offset }) => {
        const { rows } = await searchEntries({
          project,
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
              `[id: ${row.id}] ${row.date} — ${row.project} (${row.category.join(", ")})\n${previewSummary(row.summary)}`,
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
          id: z.uuid(),
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
              text: `Deleted entry for ${row.project} on ${row.date}.`,
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
