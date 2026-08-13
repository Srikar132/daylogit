import { createMcpHandler, withMcpAuth } from "mcp-handler";
import { z } from "zod";
import { verifyOAuthBearer, type OAuthIdentity } from "@/lib/mcp-auth";
import { canWriteEntries } from "@/lib/permissions";
import { WORK_TYPES, type WorkType } from "@/lib/constants";
import {
  createOrAppendEntry,
  getTodayEntries,
  previewSummary,
  searchEntries,
  softDeleteEntry,
  updateEntry,
  updateEntryStatus,
} from "@/lib/worklog";

const TASK_STATUS_VALUES = ["todo", "in_progress", "completed"] as const;
const WORK_TYPE_VALUES = WORK_TYPES.map((t) => t.value) as [WorkType, ...WorkType[]];

type ToolExtra = { authInfo?: { extra?: Record<string, unknown> } };

function identityFrom(extra: ToolExtra): OAuthIdentity {
  const identity = extra.authInfo?.extra as OAuthIdentity | undefined;
  if (!identity) {
    throw new Error("Missing authenticated identity for this MCP request.");
  }
  return identity;
}

function requireWriteAccess(identity: OAuthIdentity) {
  if (!canWriteEntries(identity.role)) {
    throw new Error(
      "This account has view-only access on its workspace — ask a workspace owner/admin for write access.",
    );
  }
}

const handler = createMcpHandler(
  (server) => {
    server.registerTool(
      "create_or_append_entry",
      {
        title: "Log work entry",
        description:
          "Creates a worklog entry on a given date (defaults to today in IST). " +
          "Lands in the 'todo' column of the board unless a status is given.",
        inputSchema: {
          title: z.string().optional().describe("Title of the log entry"),
          summary: z
            .string()
            .describe(
              "Specific description/details of work done. Generic filler like 'worked on stuff' is rejected.",
            ),
          status: z
            .enum(TASK_STATUS_VALUES)
            .optional()
            .describe("Board column to log into: todo, in_progress, or completed. Defaults to todo."),
          workType: z
            .enum(WORK_TYPE_VALUES)
            .optional()
            .describe(`Work type: ${WORK_TYPE_VALUES.join(", ")}. Defaults to task.`),
          dueDate: z
            .string()
            .regex(/^\d{4}-\d{2}-\d{2}$/)
            .optional()
            .describe("YYYY-MM-DD due date, optional"),
          date: z
            .string()
            .regex(/^\d{4}-\d{2}-\d{2}$/)
            .optional()
            .describe("YYYY-MM-DD, defaults to today in IST"),
        },
      },
      async ({ title, summary, status, workType, dueDate, date }, extra) => {
        const identity = identityFrom(extra);
        requireWriteAccess(identity);
        const row = await createOrAppendEntry(identity.organizationId, identity.userId, {
          title,
          summary,
          status,
          workType,
          dueDate,
          date,
        });
        return {
          content: [
            {
              type: "text",
              text: `Logged [id: ${row.id}] as '${row.workType}' in '${row.status}' on ${row.date}.`,
            },
          ],
        };
      },
    );

    server.registerTool(
      "update_entry",
      {
        title: "Update worklog entry",
        description: "Updates the title or summary of an existing log entry by entry id.",
        inputSchema: {
          id: z.string().describe("Entry UUID"),
          title: z.string().optional().describe("Updated log title"),
          summary: z.string().optional().describe("Updated log summary/details"),
        },
      },
      async ({ id, title, summary }, extra) => {
        const identity = identityFrom(extra);
        requireWriteAccess(identity);
        const updated = await updateEntry(identity.organizationId, id, {
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
      "move_entry",
      {
        title: "Move worklog entry to another status",
        description: "Moves a task between the board's fixed columns: todo, in_progress, completed.",
        inputSchema: {
          id: z.string().describe("Entry UUID"),
          status: z.enum(TASK_STATUS_VALUES).describe("Target column: todo, in_progress, or completed"),
        },
      },
      async ({ id, status }, extra) => {
        const identity = identityFrom(extra);
        requireWriteAccess(identity);
        const updated = await updateEntryStatus(identity.organizationId, id, status);
        return {
          content: [
            { type: "text", text: `Moved entry [id: ${updated.id}] to '${updated.status}'.` },
          ],
        };
      },
    );

    server.registerTool(
      "get_today",
      {
        title: "Get today's worklog",
        description: "Returns all worklog entries for today (IST).",
        inputSchema: {},
      },
      async (extra) => {
        const identity = identityFrom(extra);
        const { date, rows } = await getTodayEntries(identity.organizationId);

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
              `[id: ${row.id}] (${row.status}) ${row.title ? `${row.title} - ` : ""}${row.summary}`,
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
        description: "Search worklog entries by date range. Always paginated.",
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
      async ({ from, to, limit, offset }, extra) => {
        const identity = identityFrom(extra);
        const { rows } = await searchEntries(identity.organizationId, {
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
              `[id: ${row.id}] ${row.date} (${row.status}) — ${row.title ? `${row.title} - ` : ""}${previewSummary(row.summary)}`,
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
      async ({ id }, extra) => {
        const identity = identityFrom(extra);
        requireWriteAccess(identity);
        const row = await softDeleteEntry(identity.organizationId, id);

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

const authHandler = withMcpAuth(handler, verifyOAuthBearer, {
  required: true,
});

export { authHandler as GET, authHandler as POST, authHandler as DELETE };
