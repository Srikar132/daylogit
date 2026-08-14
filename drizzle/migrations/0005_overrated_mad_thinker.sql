ALTER TABLE "sections" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "sections" CASCADE;--> statement-breakpoint
ALTER TABLE "entries" DROP CONSTRAINT "entries_section_id_sections_id_fk";
--> statement-breakpoint
DROP INDEX "entries_section_id_idx";--> statement-breakpoint
ALTER TABLE "entries" DROP COLUMN "section_id";