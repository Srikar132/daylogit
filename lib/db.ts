import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import {
  date,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

export const entries = pgTable(
  "entries",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    date: date("date").notNull(),
    project: text("project").notNull(),
    category: text("category").array().notNull(),
    summary: text("summary").notNull(),
    deletedAt: timestamp("deleted_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [uniqueIndex("date_project_idx").on(table.date, table.project)],
);

const sql = neon(process.env.DATABASE_URL!);

export const db = drizzle(sql, { schema: { entries } });
