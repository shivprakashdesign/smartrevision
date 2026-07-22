-- SmartRevision — Leaderboard ranked by Gems
-- Paste into Supabase → SQL Editor → Run. Requires supabase_gems.sql first
-- (needs the students.gems column).
--
-- Replaces get_leaderboard so the Rank page ranks classmates by lifetime gems
-- and returns the gems value. Kept SECURITY DEFINER and column-limited so a
-- classmate only ever sees id/name/streak/gems — never the full student row.

drop function if exists get_leaderboard(uuid);

create function get_leaderboard(class_id_param uuid)
returns table (
  student_id uuid,
  name text,
  current_streak int,
  gems int,
  rank bigint
)
language sql
security definer
set search_path = public
as $$
  select
    s.id as student_id,
    s.name,
    s.current_streak,
    s.gems,
    row_number() over (order by s.gems desc, s.current_streak desc, s.name asc) as rank
  from students s
  where s.class_id = class_id_param
    -- Only members of the class may read its leaderboard.
    and exists (
      select 1 from students me
      where me.owner_account_id = auth.uid()
        and me.class_id = class_id_param
    )
$$;
