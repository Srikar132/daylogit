import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import {
  boolean,
  date,
  index,
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

export const apiKeys = pgTable(
  "api_keys",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    name: text("name").notNull().default("Default key"),
    keyHash: text("key_hash").notNull().unique(),
    lastUsedAt: timestamp("last_used_at"),
    revokedAt: timestamp("revoked_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [index("api_keys_user_id_org_id_idx").on(table.userId, table.organizationId)],
);

export type WidgetLayoutItem = {
  id: string;
  type: string;
  x: number;
  y: number;
  width: number;
  height: number;
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

const sql = neon(process.env.DATABASE_URL || "postgres://placeholder:placeholder@localhost/placeholder");

export const db = drizzle(sql, {
  schema: {
    entries,
    apiKeys,
    widgetLayouts,
    ...authSchema,
  },
});

