-- ============================================================
-- Subject colours — run this whole file in Supabase → SQL Editor → Run.
-- Subjects aren't a table: a subject is just the `subject` text on a topic,
-- derived per student. To let a student recolour a subject (instead of the
-- auto colour hashed from its name), we store per-subject overrides as a
-- name → palette-key map on the student row. It rides along for free with the
-- existing `select('*')` in useStudentProfile.
-- ============================================================

alter table students add column if not exists subject_colors jsonb default '{}'::jsonb;

-- Backfill existing rows so reads never see null.
update students set subject_colors = '{}'::jsonb where subject_colors is null;
