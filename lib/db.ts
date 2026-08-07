import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import {
  boolean,
  date,
  integer,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

export const sections = pgTable("sections", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  date: date("date"),
  order: integer("order").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const entries = pgTable("entries", {
  id: uuid("id").defaultRandom().primaryKey(),
  date: date("date").notNull(),
  project: text("project").notNull(),
  category: text("category").array().notNull(),
  title: text("title"),
  summary: text("summary").notNull(),
  sectionName: text("section_name").notNull().default("My Tasks"),
  completed: boolean("completed").notNull().default(false),
  completedAt: timestamp("completed_at"),
  deletedAt: timestamp("deleted_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

const sql = neon(process.env.DATABASE_URL!);

export const db = drizzle(sql, { schema: { entries, sections } });

