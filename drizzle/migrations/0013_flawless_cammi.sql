DROP INDEX "widgets_id_org_user_uidx";--> statement-breakpoint
DROP INDEX "widgets_org_user_idx";--> statement-breakpoint
-- The old unique index spanned user_id, so the pinned default widgets (board-1,
-- mail-summary-1, workspace-settings-1) could exist once per member of the same
-- organization — and did, for every member who opened a workspace while the read
-- was still per-user. The narrowed index below rejects those, so collapse each
-- (organization_id, id) group to a single row first, keeping the most recently
-- updated copy (pk as a deterministic tie-break).
DELETE FROM "widgets" w
USING (
  SELECT pk,
         row_number() OVER (
           PARTITION BY organization_id, id
           ORDER BY updated_at DESC, pk
         ) AS rn
  FROM "widgets"
) d
WHERE w.pk = d.pk AND d.rn > 1;--> statement-breakpoint
CREATE UNIQUE INDEX "widgets_id_org_uidx" ON "widgets" USING btree ("id","organization_id");--> statement-breakpoint
CREATE INDEX "widgets_org_idx" ON "widgets" USING btree ("organization_id");
