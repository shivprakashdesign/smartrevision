-- SmartRevision — Persist longest (best-ever) streak
-- Paste into Supabase → SQL Editor → Run. Requires supabase_streak_freeze.sql first
-- (this replaces its record_activity function to also track the all-time best).
--
-- Why persist instead of derive on the client: the Progress page can only infer
-- "best streak" from revision rows still present. Once old completed revisions age
-- out, the derived value shrinks. A stored high-water mark never regresses.

-- 1. Column (0 default; backfilled below) -----------------------------------------
alter table students add column if not exists longest_streak int not null default 0;

-- 2. Backfill — best effort. We can't reconstruct true history, so seed the mark
-- with each student's current streak (their known-good floor).
update students
  set longest_streak = greatest(coalesce(longest_streak, 0), coalesce(current_streak, 0));

-- 3. record_activity — same as supabase_streak_freeze.sql, plus it bumps the
-- high-water mark whenever the live streak sets a new record.
create or replace function record_activity(p_student_id uuid)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  s            record;
  today        date := current_date;
  gap          int;
  missed       int;
  v_streak     int;
  v_freezes    int;
  v_froze      boolean := false;
  v_broke      boolean := false;
  v_milestone  boolean := false;
begin
  select current_streak, last_activity_date, streak_freezes, owner_account_id
    into s
  from students where id = p_student_id;

  -- Only the owning account (self or managing parent) may record activity.
  if not found or s.owner_account_id <> auth.uid() then
    return json_build_object('ok', false, 'error', 'not_authorized');
  end if;

  v_streak  := coalesce(s.current_streak, 0);
  v_freezes := coalesce(s.streak_freezes, 0);

  -- Already counted today → no-op.
  if s.last_activity_date = today then
    return json_build_object('ok', true, 'streak', v_streak, 'froze', false,
      'broke', false, 'freezes_left', v_freezes, 'milestone', false);
  end if;

  if s.last_activity_date is null then
    v_streak := 1;
  else
    gap := today - s.last_activity_date;
    if gap = 1 then
      v_streak := v_streak + 1;                 -- consecutive day
    else
      missed := gap - 1;                        -- fully skipped days
      if v_freezes >= missed then
        v_freezes := v_freezes - missed;        -- freezes cover the gap
        v_froze   := true;
        v_streak  := v_streak + 1;
      else
        v_broke  := true;                       -- not enough freezes → reset
        v_streak := 1;
      end if;
    end if;
  end if;

  if v_streak > 0 and v_streak % 7 = 0 then
    v_milestone := true;                        -- 7-day milestone gem bonus
  end if;

  update students
    set current_streak    = v_streak,
        longest_streak     = greatest(coalesce(longest_streak, 0), v_streak),
        last_activity_date = today,
        streak_freezes     = v_freezes,
        gems               = gems + case when v_milestone then 50 else 0 end
  where id = p_student_id;

  return json_build_object('ok', true, 'streak', v_streak, 'froze', v_froze,
    'broke', v_broke, 'freezes_left', v_freezes, 'milestone', v_milestone);
end;
$$;
