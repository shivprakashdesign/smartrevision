-- SmartRevision — Drop the legacy free-text class columns
-- Paste into Supabase → SQL Editor → Run. Requires supabase_schools.sql, and a
-- release in which nothing writes these columns (shipped: school is chosen from
-- the canonical `schools` table, grade from chips).
--
-- Kept for one release so a rollback was a code revert, not a data restore.
-- Verified empty before dropping: every `classes` row had school_name,
-- class_name and normalized_key null. `if exists` makes this a no-op on a
-- database where they're already gone.

alter table classes drop column if exists school_name;
alter table classes drop column if exists class_name;
alter table classes drop column if exists normalized_key;
