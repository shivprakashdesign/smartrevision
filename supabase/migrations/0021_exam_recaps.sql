-- The exam receipt: after an exam, the student tags which topics appeared on
-- the paper. One row per student per exam date; the receipt itself is
-- recomputed from topics/revisions, so only the tagging is stored.

create table exam_recaps (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references students(id) on delete cascade,
  exam_date date not null,
  appeared_topic_ids uuid[] not null default '{}',
  created_at timestamp default now(),
  unique (student_id, exam_date)
);

alter table exam_recaps enable row level security;

create policy "own exam recaps" on exam_recaps
  for all using (
    student_id in (select id from students where owner_account_id = auth.uid())
  );
