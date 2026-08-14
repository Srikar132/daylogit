CREATE TYPE "public"."task_status" AS ENUM('todo', 'in_progress', 'completed');--> statement-breakpoint
ALTER TABLE "entries" ADD COLUMN "status" "task_status" DEFAULT 'todo' NOT NULL;--> statement-breakpoint
CREATE INDEX "entries_organization_id_date_status_idx" ON "entries" USING btree ("organization_id","date","status");