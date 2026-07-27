-- Closing the loop on "how long can you study today?".
-- missions.available_min is what the student PLANNED; actual_min is what they
-- actually did. The pair is what makes consistency honest — and what lets a
-- future planner learn that a student who says 120 reliably does 60.
-- Nullable on purpose: an un-logged day is "unknown", never "zero".
-- Run in SQL editor.

alter table missions add column if not exists actual_min smallint;
