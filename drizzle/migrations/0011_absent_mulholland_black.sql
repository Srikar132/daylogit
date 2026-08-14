CREATE TABLE "widgets" (
	"pk" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"id" text NOT NULL,
	"organization_id" text NOT NULL,
	"user_id" text NOT NULL,
	"type" text NOT NULL,
	"x" integer NOT NULL,
	"y" integer NOT NULL,
	"width" integer NOT NULL,
	"height" integer,
	"data" jsonb,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "widgets" ADD CONSTRAINT "widgets_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "widgets" ADD CONSTRAINT "widgets_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "widgets_id_org_user_uidx" ON "widgets" USING btree ("id","organization_id","user_id");--> statement-breakpoint
CREATE INDEX "widgets_org_user_idx" ON "widgets" USING btree ("organization_id","user_id");--> statement-breakpoint
-- One-time data migration: unpack every existing widget_layouts.layout
-- JSONB array into individual widgets rows. Idempotent (ON CONFLICT DO
-- NOTHING against the (id, organization_id, user_id) unique index), so
-- re-running this migration file is harmless. widget_layouts itself is left
-- in place as a rollback source, not dropped here.
INSERT INTO "widgets" ("id", "organization_id", "user_id", "type", "x", "y", "width", "height", "data", "updated_at")
SELECT
	elem->>'id',
	wl.organization_id,
	wl.user_id,
	elem->>'type',
	(elem->>'x')::integer,
	(elem->>'y')::integer,
	(elem->>'width')::integer,
	CASE WHEN elem->>'height' IS NULL THEN NULL ELSE (elem->>'height')::integer END,
	elem->'data',
	wl.updated_at
FROM "widget_layouts" wl, jsonb_array_elements(wl.layout) AS elem
ON CONFLICT ("id", "organization_id", "user_id") DO NOTHING;