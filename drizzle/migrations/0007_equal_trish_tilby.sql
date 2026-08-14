CREATE TABLE "doc_pages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"doc_project_id" uuid NOT NULL,
	"title" text DEFAULT 'Untitled' NOT NULL,
	"content" jsonb,
	"position" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "doc_projects" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"github_links" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"resource_links" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"live_link" text,
	"share_token" text NOT NULL,
	"is_public" boolean DEFAULT false NOT NULL,
	"created_by" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "doc_pages" ADD CONSTRAINT "doc_pages_doc_project_id_doc_projects_id_fk" FOREIGN KEY ("doc_project_id") REFERENCES "public"."doc_projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "doc_projects" ADD CONSTRAINT "doc_projects_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "doc_projects" ADD CONSTRAINT "doc_projects_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "doc_pages_doc_project_id_idx" ON "doc_pages" USING btree ("doc_project_id");--> statement-breakpoint
CREATE INDEX "doc_projects_organization_id_idx" ON "doc_projects" USING btree ("organization_id");--> statement-breakpoint
CREATE UNIQUE INDEX "doc_projects_share_token_uidx" ON "doc_projects" USING btree ("share_token");