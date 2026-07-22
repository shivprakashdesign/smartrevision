-- SmartRevision — Student board
-- Paste into Supabase → SQL Editor → Run. Requires supabase_schema.sql.
--
-- Which examination board a student follows. Drives which hardcoded syllabus the
-- study-plan picker offers (src/lib/syllabus.js) and which board-marks lens is
-- available. Text, not an enum, so adding a board later needs no migration —
-- the app validates against SYLLABUS_BOARDS. Defaults to CBSE (our first board).

alter table students add column if not exists board text not null default 'CBSE';
