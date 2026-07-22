-- SmartRevision — Study plan inputs (daily study time, subject weakness, exam lens)
-- Paste into Supabase → SQL Editor → Run. Requires supabase_schema.sql.
--
-- The weighted study-plan engine (src/lib/studyPlan.js) turns a student's picked
-- chapters into a weekly calendar. Beyond the exam date and study days it already
-- has, it needs three more answers, stored here:
--
--   daily_study_min — how many minutes the student can study on a study day. The
--                     size of the pool the engine divides across topics.
--   weak_subjects   — subjects the student says they're weak in; the engine gives
--                     their chapters more time (WEAK_MULT). Subject-level for v1.
--   exam_lens       — which importance weighting to plan against: 'jee' (JEE Main
--                     chapter weightage) or 'board' (CBSE board marks). A Class 12
--                     JEE aspirant has both exams; this picks the lens. null means
--                     not chosen — the client defaults to 'jee'.

alter table students add column if not exists daily_study_min smallint;
alter table students add column if not exists weak_subjects text[] not null default '{}';
alter table students add column if not exists exam_lens text;

-- null stays allowed (constraint is not-false for null); only a bad string fails.
alter table students drop constraint if exists students_exam_lens_check;
alter table students add constraint students_exam_lens_check
  check (exam_lens is null or exam_lens in ('jee', 'board'));
