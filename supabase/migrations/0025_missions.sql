-- Today's Mission: the daily plan the coach mode proposes and the student
-- accepts. One mission per student per day (regenerate updates it in place).
-- Items store IDENTITIES (revision id / curriculum topic id), never copies of
-- state — the renderer re-derives live status from revisions/topics, so a
-- revision completed elsewhere shows as done instead of being asked again.
-- Run in SQL editor.

create table missions (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references students(id) on delete cascade,
  mission_date date not null,
  available_min smallint not null,
  status text not null default 'accepted' check (status in ('draft', 'accepted', 'completed', 'abandoned')),
  seed smallint not null default 0,
  engine_version text,
  created_at timestamptz default now(),
  unique (student_id, mission_date)
);

create table mission_items (
  id uuid primary key default gen_random_uuid(),
  mission_id uuid not null references missions(id) on delete cascade,
  kind text not null check (kind in ('new', 'revision', 'recovery')),
  subject text,
  label text not null,
  curriculum_topic_id text,
  plan_item_id uuid references plan_items(id) on delete set null,
  topic_id uuid references topics(id) on delete cascade,
  revision_id uuid references revisions(id) on delete cascade,
  planned_min smallint not null,
  position int not null default 0,
  pinned boolean not null default false,
  state text not null default 'pending' check (state in ('pending', 'done', 'skipped'))
);

create index missions_student_date_idx on missions(student_id, mission_date);
create index mission_items_mission_idx on mission_items(mission_id);

alter table missions enable row level security;
alter table mission_items enable row level security;

create policy "own missions" on missions
  for all using (
    student_id in (select id from students where owner_account_id = auth.uid())
  );

create policy "own mission items" on mission_items
  for all using (
    mission_id in (
      select m.id from missions m
      join students s on s.id = m.student_id
      where s.owner_account_id = auth.uid()
    )
  );
