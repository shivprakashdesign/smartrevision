-- ============================================================
-- Server-side Pro enforcement — run in Supabase → SQL Editor → Run. Idempotent.
-- Backstops the client gates so limits can't be bypassed via direct API calls.
-- NOTE: the numbers below (10 topics, 1 photo) must match plan.js.
-- ============================================================

-- Is this account on an active Pro plan? (runs as the calling user; they can
-- always read their own account row via RLS)
create or replace function sr_account_is_pro(acct uuid)
returns boolean
language sql
stable
security invoker
as $$
  select coalesce(
    (select (plan = 'pro' and (pro_until is null or pro_until > now()))
       from accounts where id = acct),
    false);
$$;

-- Topics: block custom schedules and enforce the free topic cap for non-Pro.
create or replace function sr_enforce_topic_limits()
returns trigger
language plpgsql
security invoker
as $$
declare
  v_owner uuid;
  v_cnt int;
begin
  select owner_account_id into v_owner from students where id = NEW.student_id;

  if sr_account_is_pro(v_owner) then
    return NEW;
  end if;

  -- custom schedule is Pro-only (only when setting/changing to custom, so
  -- unrelated updates to an already-custom topic aren't blocked)
  if NEW.schedule_type = 'custom'
     and (TG_OP = 'INSERT' or OLD.schedule_type is distinct from 'custom') then
    raise exception 'PRO_REQUIRED: custom schedules need Pro';
  end if;

  -- topic cap on creation
  if TG_OP = 'INSERT' then
    select count(*) into v_cnt
      from topics t join students s on s.id = t.student_id
      where s.owner_account_id = v_owner;
    if v_cnt >= 10 then
      raise exception 'PRO_REQUIRED: free plan is limited to 10 topics';
    end if;
  end if;

  return NEW;
end;
$$;

drop trigger if exists trg_enforce_topic_limits on topics;
create trigger trg_enforce_topic_limits
  before insert or update on topics
  for each row execute function sr_enforce_topic_limits();

-- Photos: one per topic for non-Pro accounts.
create or replace function sr_enforce_photo_limit()
returns trigger
language plpgsql
security invoker
as $$
declare
  v_owner uuid;
  v_cnt int;
begin
  select s.owner_account_id into v_owner
    from topics t join students s on s.id = t.student_id
    where t.id = NEW.topic_id;

  if sr_account_is_pro(v_owner) then
    return NEW;
  end if;

  select count(*) into v_cnt from topic_images where topic_id = NEW.topic_id;
  if v_cnt >= 1 then
    raise exception 'PRO_REQUIRED: free plan is limited to 1 photo per topic';
  end if;

  return NEW;
end;
$$;

drop trigger if exists trg_enforce_photo_limit on topic_images;
create trigger trg_enforce_photo_limit
  before insert on topic_images
  for each row execute function sr_enforce_photo_limit();
