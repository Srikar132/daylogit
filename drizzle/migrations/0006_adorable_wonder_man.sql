ALTER TABLE "entries" ADD COLUMN "work_type" text DEFAULT 'task' NOT NULL;--> statement-breakpoint
ALTER TABLE "entries" ADD COLUMN "due_date" date;