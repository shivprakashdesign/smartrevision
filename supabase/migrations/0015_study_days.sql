-- SmartRevision — Study days (a rest day is not a missed day)
-- Paste into Supabase → SQL Editor → Run. Requires supabase_longest_streak.sql
-- first (this replaces its record_activity function again).
--
-- The streak previously counted every skipped calendar day as missed, so a
-- student who never studies on Sunday either lost their streak every week or
-- burned a freeze to buy back a day they never intended to study. Neither is
-- honest, and manufacturing guilt for a rest day is exactly the opposite of
-- what the app is meant to do.
--
-- Storing the days a student actually studies lets the gap calculation skip the
-- rest of them. Nothing is forgiven that wasn't already free.

-- 1. Column. ISO day-of-week: 1 = Monday ... 7 = Sunday. Default Mon–Sat.
alter table students add column if not exists study_days smallint[] not null default '{1,2,3,4,5,6}';

-- 2. record_activity — as in supabase_longest_streak.sql, except that the gap
-- between the last activity and today is measured in *study* days.
create or replace function record_activity(p_student_id uuid)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  s            record;
  today        date := current_date;
  missed       int;
  v_streak     int;
  v_freezes    int;
  v_days       smallint[];
  v_froze      boolean := false;
  v_broke      boolean := false;
  v_milestone  boolean := false;
begin
  select current_streak, last_activity_date, streak_freezes, owner_account_id, study_days
    into s
  from students where id = p_student_id;

  -- Only the owning account (self or managing parent) may record activity.
  if not found or s.owner_account_id <> auth.uid() then
    return json_build_object('ok', false, 'error', 'not_authorized');
  end if;

  v_streak  := coalesce(s.current_streak, 0);
  v_freezes := coalesce(s.streak_freezes, 0);
  v_days    := s.study_days;

  -- Fail closed. An empty set would make every gap zero-length and the streak
  -- unbreakable, so treat "no study days" as "every day".
  if v_days is null or cardinality(v_days) = 0 then
    v_days := '{1,2,3,4,5,6,7}';
  end if;

  -- Already counted today → no-op.
  if s.last_activity_date = today then
    return json_build_object('ok', true, 'streak', v_streak, 'froze', false,
      'broke', false, 'freezes_left', v_freezes, 'milestone', false);
  end if;

  if s.last_activity_date is null then
    v_streak := 1;
  else
    -- Study days strictly between the last activity and today. A one-day gap
    -- yields an empty series, as does a gap made only of rest days.
    select count(*) into missed
    from generate_series(s.last_activity_date + 1, today - 1, interval '1 day') d
    where extract(isodow from d)::smallint = any(v_days);

    if missed = 0 then
      v_streak := v_streak + 1;                 -- consecutive, or only rest days between
    elsif v_freezes >= missed then
      v_freezes := v_freezes - missed;          -- freezes cover the missed study days
      v_froze   := true;
      v_streak  := v_streak + 1;
    else
      v_broke  := true;                         -- not enough freezes → reset
      v_streak := 1;
    end if;
  end if;

  if v_streak > 0 and v_streak % 7 = 0 then
    v_milestone := true;                        -- 7-day milestone gem bonus
  end if;

  update students
    set current_streak     = v_streak,
        longest_streak     = greatest(coalesce(longest_streak, 0), v_streak),
        last_activity_date = today,
        streak_freezes     = v_freezes,
        gems               = gems + case when v_milestone then 50 else 0 end
  where id = p_student_id;

  return json_build_object('ok', true, 'streak', v_streak, 'froze', v_froze,
    'broke', v_broke, 'freezes_left', v_freezes, 'milestone', v_milestone);
end;
$$;
