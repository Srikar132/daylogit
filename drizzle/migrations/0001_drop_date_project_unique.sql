-- ─────────────────────────────────────────────────────────────
-- Migration 0001: individual log rows
--
-- 1. Split every multi-bullet entry (summary contains \n) into
--    separate rows — one row per bullet point.
-- 2. Drop the unique index that enforced one row per (date, project).
-- ─────────────────────────────────────────────────────────────

-- Step 1: Expand multi-bullet summaries into individual rows
DO $$
DECLARE
  r       RECORD;
  bullets TEXT[];
  bullet  TEXT;
  is_first BOOLEAN;
BEGIN
  FOR r IN
    SELECT id, date, project, category, summary,
           deleted_at, created_at, updated_at
    FROM   entries
    WHERE  summary LIKE E'%\n%'
  LOOP
    bullets  := string_to_array(r.summary, E'\n');
    is_first := TRUE;

    FOREACH bullet IN ARRAY bullets LOOP
      -- Strip leading "- " prefix and surrounding whitespace
      bullet := trim(regexp_replace(bullet, '^-\s*', ''));
      CONTINUE WHEN bullet = '';          -- skip blank lines

      IF is_first THEN
        -- Reuse the original row for the first bullet
        UPDATE entries SET summary = bullet WHERE id = r.id;
        is_first := FALSE;
      ELSE
        -- Each remaining bullet becomes a brand-new row
        INSERT INTO entries
          (date, project, category, summary,
           deleted_at, created_at, updated_at)
        VALUES
          (r.date, r.project, r.category, bullet,
           r.deleted_at, r.created_at, r.updated_at);
      END IF;
    END LOOP;
  END LOOP;
END $$;

--> statement-breakpoint

-- Step 2: Drop the unique constraint (now safe — data is already split)
DROP INDEX IF EXISTS "date_project_idx";
