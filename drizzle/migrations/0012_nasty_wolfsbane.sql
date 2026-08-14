CREATE TYPE "public"."cloudinary_cleanup_status" AS ENUM('pending', 'done', 'failed');--> statement-breakpoint
CREATE TABLE "cloudinary_cleanup_jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"public_id" text NOT NULL,
	"status" "cloudinary_cleanup_status" DEFAULT 'pending' NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"last_error" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "cloudinary_cleanup_jobs_status_idx" ON "cloudinary_cleanup_jobs" USING btree ("status","created_at");