-- ============================================================
-- Pro plan / entitlement — run in Supabase → SQL Editor → Run. Idempotent.
-- ============================================================

-- Plan lives on the account. A user is Pro when plan = 'pro' AND
-- (pro_until is null OR pro_until > now()).
alter table accounts add column if not exists plan text default 'free';
alter table accounts add column if not exists pro_until timestamptz;

-- CRITICAL: entitlement must never be client-writable, or anyone could grant
-- themselves Pro via the API. The "own account" policy is FOR ALL (lets users
-- edit their own row), so we lock these two columns at the privilege level.
-- Only the service role (payment webhooks) and the SQL editor can set them.
revoke update (plan, pro_until) on accounts from authenticated, anon;

-- ------------------------------------------------------------
-- Manually grant / revoke Pro for testing (run as needed):
--   update accounts set plan = 'pro'  where id = '<auth-user-uuid>';
--   update accounts set plan = 'free', pro_until = null where id = '<auth-user-uuid>';
-- Find a user's id in Authentication → Users, or:
--   select id, name, plan from accounts order by created_at desc;
-- ------------------------------------------------------------
