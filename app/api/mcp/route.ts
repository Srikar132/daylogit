import { createMcpHandler, withMcpAuth } from "mcp-handler";
import { z } from "zod";
import { verifyApiKey } from "@/lib/auth";
import { CATEGORIES, PROJECTS } from "@/lib/constants";
import {
  createOrAppendEntry,
  getTodayEntries,
  previewSummary,
  searchEntries,
  softDeleteEntry,
} from "@/lib/worklog";

const handler = createMcpHandler(
  (server) => {
    server.registerTool(
      "create_or_append_entry",
      {
        title: "Log work entry",
        description:
          "Create or append a worklog entry for a project on a given date (defaults to today, IST). " +
          "If an entry already exists for that date+project, the summary is appended as a new bullet " +
          "and categories are merged — past bullets are never overwritten. " +
          "If a session runs past midnight IST, log against the date the session started, not when this tool is called.",
        inputSchema: {
          project: z.enum(PROJECTS),
          category: z.array(z.enum(CATEGORIES)).min(1),
          summary: z
            .string()
            .describe(
              "Specific description of the work done. Generic filler like 'worked on stuff' is rejected.",
            ),
          date: z
            .string()
            .regex(/^\d{4}-\d{2}-\d{2}$/)
            .optional()
            .describe("YYYY-MM-DD, defaults to today in IST"),
        },
      },
      async ({ project, category, summary, date }) => {
        const row = await createOrAppendEntry({
          project,
          category,
          summary,
          date,
        });
        return {
          content: [
            {
              type: "text",
              text: `Logged for ${row.project} on ${row.date}. Entry now has ${row.summary.split("\n").length} bullet(s).`,
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
