-- Web-push notifications: device subscriptions + delivery bookkeeping.
-- Run AFTER supabase_schema.sql (needs accounts + notification_preferences).

-- ============================================================
-- 1. DEVICE SUBSCRIPTIONS
-- One row per browser/device that turned notifications on. A student can
-- have several (phone PWA + laptop); dead ones are pruned by the sender
-- when the push service answers 404/410.
-- ============================================================
create table push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references accounts(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at timestamp default now()
);

create index push_subscriptions_account_idx on push_subscriptions(account_id);

alter table push_subscriptions enable row level security;

create policy "own push subscriptions" on push_subscriptions
  for all using (auth.uid() = account_id) with check (auth.uid() = account_id);

-- ============================================================
-- 2. PREFERENCES: timezone + once-a-day dedup markers
-- Times in notification_preferences are the student's local clock; the
-- sender needs to know WHICH clock. The sent-on dates (local dates) make
-- it safe to run the sender as often as we like.
-- ============================================================
alter table notification_preferences
  add column if not exists timezone text default 'Asia/Kolkata',
  add column if not exists last_daily_sent_on date,
  add column if not exists last_streak_sent_on date;

-- ============================================================
-- 3. SCHEDULER (optional but recommended)
-- Vercel Hobby crons fire only once a day, which can't honour per-student
-- reminder times. pg_cron + pg_net ping the sender every 15 minutes instead.
-- Fill in YOUR-DOMAIN and YOUR-CRON-SECRET (same value as the CRON_SECRET
-- env var on Vercel), then run this block.
-- ============================================================
-- create extension if not exists pg_cron;
-- create extension if not exists pg_net;
--
-- select cron.schedule(
--   'smartrevision-notify',
--   '*/15 * * * *',
--   $$
--   select net.http_post(
--     url := 'https://YOUR-DOMAIN.vercel.app/api/notify',
--     headers := '{"Authorization": "Bearer YOUR-CRON-SECRET"}'::jsonb
--   );
--   $$
-- );
