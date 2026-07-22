-- ============================================================
-- Topic archive — run this whole file in Supabase → SQL Editor → Run.
-- Adds a soft-archive flag so students can hide finished/abandoned topics
-- without losing their revision history, and lets a hard delete cascade
-- cleanly through a topic's child rows.
-- ============================================================

-- 1. Soft-archive flag. Archived topics are hidden from Home / Topics / Progress
--    but kept in the database until the student explicitly deletes them.
alter table topics add column if not exists archived boolean default false;

-- Backfill existing rows so `archived = false` filters match them.
update topics set archived = false where archived is null;

-- Partial index: the common query is "my active topics", so index those.
create index if not exists idx_topics_active
  on topics(student_id) where archived is not true;

-- 2. Make a hard delete of a topic cascade to its children. The original
--    schema created these FKs without ON DELETE CASCADE; recreate them so
--    deleting a topic doesn't trip a foreign-key violation. (topic_images
--    already cascades.) Postgres' default constraint name is
--    <table>_<column>_fkey.
alter table revisions        drop constraint if exists revisions_topic_id_fkey;
alter table revisions        add  constraint revisions_topic_id_fkey
  foreign key (topic_id) references topics(id) on delete cascade;

alter table recall_cards     drop constraint if exists recall_cards_topic_id_fkey;
alter table recall_cards     add  constraint recall_cards_topic_id_fkey
  foreign key (topic_id) references topics(id) on delete cascade;

alter table journal_entries  drop constraint if exists journal_entries_topic_id_fkey;
alter table journal_entries  add  constraint journal_entries_topic_id_fkey
  foreign key (topic_id) references topics(id) on delete cascade;
