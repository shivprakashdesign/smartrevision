# Supabase migrations

Ordered SQL files, numbered in the order they were (and must be) run against the
database. These were previously loose `supabase_*.sql` files at the repo root with
no declared order; the numbers here reproduce the historical run order.

Rules:

- **New DDL only ever lands as a new numbered file.** Never edit an existing
  migration — the database has already run it.
- Run files in ascending order on a fresh database.
- `record_activity()` (streak logic) is defined three times — `0008_streak_freeze`,
  `0009_longest_streak`, `0015_study_days` — each a full `create or replace`.
  **`0015_study_days.sql` is the authoritative version**; the earlier two are kept
  because their other statements (columns, `buy_streak_freeze`, backfills) are
  still required.
- Files marked "run in SQL editor" in their headers also assume the service-role
  context; RLS policies are included per table in the file that creates it.
