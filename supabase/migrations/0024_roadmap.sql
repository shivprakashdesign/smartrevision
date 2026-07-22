-- Roadmap: the student's own path through the curriculum.
-- plan_items (the chapter checklist) grows into the roadmap rather than a new
-- table duplicating it: it already has subject, chapter_name, position and
-- status — the roadmap adds "which chapter am I on" (active) and an optional
-- link to the bundled Curriculum Knowledge Base.
--
-- curriculum ids are TEXT with no FK: the curriculum ships inside the app as
-- JSON, not in Postgres. Null = custom/scanned content with no CKB match —
-- always allowed, Mode 1 stays first-class.
-- Run in SQL editor.

alter table plan_items add column if not exists curriculum_chapter_id text;
alter table plan_items add column if not exists active boolean not null default false;

-- One active chapter per subject per student ("Active Chapter" rule).
create unique index if not exists plan_items_one_active_per_subject
  on plan_items(student_id, subject) where active;

-- Topics link to the CKB topic they came from (picker/quick-pick set it;
-- scanned and hand-typed topics leave it null).
alter table topics add column if not exists curriculum_topic_id text;
create index if not exists topics_curriculum_idx on topics(curriculum_topic_id);
