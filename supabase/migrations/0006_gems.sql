-- SmartRevision — Gems (XP-style reward score)
-- Paste into Supabase → SQL Editor → Run. Idempotent-ish (safe to re-run).
--
-- Gems reward the core behaviour: completing revisions, on time, recalled well.
-- Accumulate-only for launch (no spending). Awarded server-side via a trigger so
-- the client can't inflate the number — it only ever reads students.gems.

-- 1. The score column ------------------------------------------------------
alter table students add column if not exists gems int not null default 0;

-- 2. Award function --------------------------------------------------------
-- Fires when a revision flips to completed. Awards:
--   +10 base · +5 if on-time (completed on/before scheduled_date)
--   +5/+2/+0 for recall_quality good/okay/struggled
-- Streak-milestone bonuses (+50 / 7 days) are handled where the streak is
-- updated, not here, to avoid double-counting.
create or replace function award_gems_on_revision_complete()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  gain int := 10;
  sid  uuid;
begin
  -- Only act on the false→true transition of `completed`.
  if new.completed is true and coalesce(old.completed, false) is false then
    -- On-time bonus: completed on or before the day it was scheduled.
    if coalesce(new.completed_at, now())::date <= new.scheduled_date then
      gain := gain + 5;
    end if;

    -- Recall-quality bonus.
    gain := gain + case new.recall_quality
      when 'good' then 5
      when 'okay' then 2
      else 0
    end;

    -- Resolve the owning student and add the gems.
    select t.student_id into sid from topics t where t.id = new.topic_id;
    if sid is not null then
      update students set gems = gems + gain where id = sid;
    end if;
  end if;

  return new;
end;
$$;

-- 3. Trigger ---------------------------------------------------------------
drop trigger if exists trg_award_gems on revisions;
create trigger trg_award_gems
  after update of completed on revisions
  for each row
  execute function award_gems_on_revision_complete();
