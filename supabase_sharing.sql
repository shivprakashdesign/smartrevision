-- ============================================================
-- Topic sharing / viral loop — run in Supabase → SQL Editor → Run.
-- Adds a public, read-only shareable link for a topic. Idempotent.
-- ============================================================

-- 1. Columns on topics: a shareable flag + an unguessable public token.
alter table topics add column if not exists shared boolean default false;
alter table topics add column if not exists share_token text unique;

create index if not exists idx_topics_share_token on topics(share_token);

-- 2. Public (anon + logged-in) READ access to shared topics and their
--    images / recall cards, so the /s/<token> page works without a login.
--    These are SELECT-only and gated on shared = true, so nothing private
--    is ever exposed — only topics the owner explicitly shared.
drop policy if exists "public read shared topics" on topics;
create policy "public read shared topics" on topics
  for select using (shared = true);

drop policy if exists "public read shared topic images" on topic_images;
create policy "public read shared topic images" on topic_images
  for select using (
    topic_id in (select id from topics where shared = true)
  );

drop policy if exists "public read shared recall cards" on recall_cards;
create policy "public read shared recall cards" on recall_cards
  for select using (
    topic_id in (select id from topics where shared = true)
  );
