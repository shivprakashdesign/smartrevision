-- SmartRevision — Exam date
-- Paste into Supabase → SQL Editor → Run. Requires supabase_schema.sql.
--
-- A student sitting boards in six weeks currently gets the same 1/2/7/30/120
-- day schedule as one sitting them in a year, so the Day-120 review is pencilled
-- in for four months after the exam it was meant to prepare them for.
--
-- Storing the date lets the client drop offsets that land after it. Truncation
-- only: redistributing five reviews into a shorter window is a real
-- spaced-repetition question and gets its own change.

alter table students add column if not exists exam_date date;
