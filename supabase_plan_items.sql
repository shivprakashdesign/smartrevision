-- The study plan: chapters from a scanned syllabus/contents page.
-- A plan item is NOT a topic — it has no revisions and no schedule. It's the
-- "what's coming this term" checklist; real topics get created day-by-day as
-- the student actually studies (that's when the forgetting curve starts).
-- Status moves pending → started (first topic logged) → done.

create table plan_items (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references students(id) on delete cascade,
  subject text not null,
  chapter_name text not null,
  position int not null default 0,
  status text not null default 'pending' check (status in ('pending', 'started', 'done')),
  created_at timestamp default now(),
  -- scanning the same page twice must not duplicate the plan
  unique (student_id, subject, chapter_name)
);

create index plan_items_student_idx on plan_items(student_id);

alter table plan_items enable row level security;

create policy "own plan items" on plan_items
  for all using (
    student_id in (select id from students where owner_account_id = auth.uid())
  );
