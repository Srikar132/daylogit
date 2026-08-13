import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import {
  boolean,
  date,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import * as authSchema from "@/lib/auth-schema";
import { user, organization } from "@/lib/auth-schema";

export * from "@/lib/auth-schema";

export const taskStatusEnum = pgEnum("task_status", ["todo", "in_progress", "completed"]);
export type TaskStatus = (typeof taskStatusEnum.enumValues)[number];

export const entries = pgTable(
  "entries",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    date: date("date").notNull(),
    title: text("title"),
    summary: text("summary").notNull(),
    status: taskStatusEnum("status").notNull().default("todo"),
    // Plain text, not a pg enum on purpose — the fixed list of work types
    // lives in lib/constants.ts (WORK_TYPES) so adding a new one is a code
    // change, not a migration.
    workType: text("work_type").notNull().default("task"),
    dueDate: date("due_date"),
    organizationId: text("organization_id").references(() => organization.id, {
      onDelete: "cascade",
    }),
    authorId: text("author_id").references(() => user.id, { onDelete: "set null" }),
    deletedAt: timestamp("deleted_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("entries_organization_id_date_idx").on(table.organizationId, table.date),
    index("entries_organization_id_date_status_idx").on(
      table.organizationId,
      table.date,
      table.status,
    ),
  ],
);

export type WidgetLayoutItem = {
  id: string;
  type: string;
  x: number;
  y: number;
  width: number;
  /** Omitted for a widget that sizes to its own content (e.g. a fresh
   *  markdown note) until the user explicitly drags a resize handle. */
  height?: number;
  /** Widget-specific persisted state — e.g. a markdown note's Tiptap content. */
  data?: Record<string, unknown>;
};

export const widgetLayouts = pgTable(
  "widget_layouts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    layout: jsonb("layout").notNull().$type<WidgetLayoutItem[]>().default([]),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("widget_layouts_user_id_org_id_uidx").on(table.userId, table.organizationId),
  ],
);

/** A titled link — a GitHub repo, a resource, etc. `label` is optional; the
 *  URL is shown alone when there isn't one. */
export type DocLink = { label?: string; url: string };

export const docProjects = pgTable(
  "doc_projects",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    description: text("description"),
    githubLinks: jsonb("github_links").notNull().$type<DocLink[]>().default([]),
    resourceLinks: jsonb("resource_links").notNull().$type<DocLink[]>().default([]),
    liveLink: text("live_link"),
    // Public share URL is always /share/docs/{shareToken} — the token
    // existing isn't itself enough to be visible; isPublic is the actual
    // gate, so unsharing doesn't require rotating/invalidating the token.
    shareToken: text("share_token").notNull(),
    isPublic: boolean("is_public").notNull().default(false),
    createdBy: text("created_by").references(() => user.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("doc_projects_organization_id_idx").on(table.organizationId),
    uniqueIndex("doc_projects_share_token_uidx").on(table.shareToken),
  ],
);

export const docPages = pgTable(
  "doc_pages",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    docProjectId: uuid("doc_project_id")
      .notNull()
      .references(() => docProjects.id, { onDelete: "cascade" }),
    title: text("title").notNull().default("Untitled"),
    content: jsonb("content").$type<Record<string, unknown>>(),
    position: integer("position").notNull().default(0),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [index("doc_pages_doc_project_id_idx").on(table.docProjectId)],
);

const sql = neon(process.env.DATABASE_URL || "postgres://placeholder:placeholder@localhost/placeholder");

export const db = drizzle(sql, {
  schema: {
    entries,
    widgetLayouts,
    docProjects,
    docPages,
    ...authSchema,
  },
});

