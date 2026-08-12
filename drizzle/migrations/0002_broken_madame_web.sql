CREATE INDEX "api_keys_user_id_org_id_idx" ON "api_keys" USING btree ("user_id","organization_id");--> statement-breakpoint
CREATE INDEX "entries_organization_id_date_idx" ON "entries" USING btree ("organization_id","date");--> statement-breakpoint
CREATE INDEX "entries_section_id_idx" ON "entries" USING btree ("section_id");--> statement-breakpoint
CREATE INDEX "sections_organization_id_idx" ON "sections" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "sections_organization_id_date_idx" ON "sections" USING btree ("organization_id","date");