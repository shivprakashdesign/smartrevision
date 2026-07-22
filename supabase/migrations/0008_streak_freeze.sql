-- SmartRevision — Real streak + Streak Freeze
-- Paste into Supabase → SQL Editor → Run. Requires supabase_gems.sql first (needs students.gems).
--
-- Makes the streak a true consecutive-day count that can BREAK on a gap, softened
-- by streak freezes (auto-consumed, buyable with gems). All server-side for
-- integrity — the client only calls the RPCs. Dates use UTC (current_date), matching
-- the app's existing new Date().toISOString() day handling.

-- 1. Freeze balance (seed everyone with 1 free so they discover the feature) -------
alter table students add column if not exists streak_freezes int not null default 1;

-- 2. record_activity — called when a revision is completed ------------------------
-- Advances the streak once per day; on a gap, spends freezes to cover missed days
-- (only if they fully cover it) else resets to 1. Also pays the 7-day gem milestone.
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
        last_activity_date = today,
        streak_freezes     = v_freezes,
        gems               = gems + case when v_milestone then 50 else 0 end
  where id = p_student_id;

  return json_build_object('ok', true, 'streak', v_streak, 'froze', v_froze,
    'broke', v_broke, 'freezes_left', v_freezes, 'milestone', v_milestone);
end;
$$;

-- 3. buy_streak_freeze — spend gems to bank a freeze (max 2) ----------------------
create or replace function buy_streak_freeze(p_student_id uuid)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  s          record;
  price      int := 50;
  max_hold   int := 2;
begin
  select gems, streak_freezes into s
  from students
  where id = p_student_id and owner_account_id = auth.uid();

  if not found then
    return json_build_object('ok', false, 'error', 'not_authorized');
  end if;
  if s.streak_freezes >= max_hold then
    return json_build_object('ok', false, 'error', 'max_reached');
  end if;
  if s.gems < price then
    return json_build_object('ok', false, 'error', 'not_enough_gems');
  end if;

  update students
    set gems = gems - price, streak_freezes = streak_freezes + 1
  where id = p_student_id;

  return json_build_object('ok', true, 'gems', s.gems - price, 'freezes', s.streak_freezes + 1);
end;
$$;
