-- ============================================================
-- Topic images — run this whole file in Supabase → SQL Editor → Run.
-- Adds multi-photo support to topics + the storage bucket they live in.
-- ============================================================

-- 1. Table: one row per photo attached to a topic
create table if not exists topic_images (
  id uuid primary key default gen_random_uuid(),
  topic_id uuid references topics(id) on delete cascade,
  image_url text not null,
  created_at timestamp default now()
);

create index if not exists idx_topic_images_topic on topic_images(topic_id);

alter table topic_images enable row level security;

-- Same ownership pattern as recall_cards / revisions: reachable only via
-- your own topic → student → account.
drop policy if exists "own topic images" on topic_images;
create policy "own topic images" on topic_images
  for all using (
    topic_id in (
      select t.id from topics t
      join students s on s.id = t.student_id
      where s.owner_account_id = auth.uid()
    )
  );

-- 2. Storage bucket the photos are uploaded to (public read so the saved
--    public URLs render without signing).
insert into storage.buckets (id, name, public)
values ('topic-images', 'topic-images', true)
on conflict (id) do nothing;

-- Any signed-in user may upload into the bucket; everyone may read.
drop policy if exists "topic images: authenticated upload" on storage.objects;
create policy "topic images: authenticated upload"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'topic-images');

drop policy if exists "topic images: authenticated delete" on storage.objects;
create policy "topic images: authenticated delete"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'topic-images');

drop policy if exists "topic images: public read" on storage.objects;
create policy "topic images: public read"
  on storage.objects for select
  using (bucket_id = 'topic-images');
