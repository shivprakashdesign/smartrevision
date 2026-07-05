-- SmartRevision — Full MVP Schema
-- Paste this whole file into Supabase → SQL Editor → Run
-- Order matters: tables reference earlier tables, so this must run top to bottom.

-- ============================================================
-- 1. CLASSES (leaderboard grouping — auto-created via school/class matching)
-- ============================================================
create table classes (
  id uuid primary key default gen_random_uuid(),
  school_name text,
  class_name text,
  normalized_key text unique,
  created_at timestamp default now()
);

-- ============================================================
-- 2. ACCOUNTS (one row per login — student or parent)
-- ============================================================
create table accounts (
  id uuid primary key references auth.users,
  account_type text check (account_type in ('student','parent')),
  name text,
  phone text,
  referral_code text unique,
  referred_by_code text,
  created_at timestamp default now()
);

-- ============================================================
-- 3. STUDENTS (one row per student PROFILE — self or parent-managed)
-- ============================================================
create table students (
  id uuid primary key default gen_random_uuid(),
  owner_account_id uuid references accounts(id),
  managed_by_parent boolean default false,
  class_id uuid references classes(id),
  name text,
  class_grade text,
  current_streak int default 0,
  last_activity_date date,
  created_at timestamp default now()
);

-- ============================================================
-- 4. TOPICS
-- ============================================================
create table topics (
  id uuid primary key default gen_random_uuid(),
  student_id uuid references students(id),
  subject text,
  topic_name text,
  date_learned date,
  familiarity text check (familiarity in ('first_time','partial','familiar')),
  priority text check (priority in ('high','medium','low')),
  notes text,
  image_url text,
  schedule_type text check (schedule_type in ('standard','custom')),
  created_at timestamp default now()
);

-- ============================================================
-- 5. RECALL CARDS
-- ============================================================
create table recall_cards (
  id uuid primary key default gen_random_uuid(),
  topic_id uuid references topics(id),
  question text,
  answer text
);

-- ============================================================
-- 6. REVISIONS
-- ============================================================
create table revisions (
  id uuid primary key default gen_random_uuid(),
  topic_id uuid references topics(id),
  scheduled_date date,
  interval_label text,
  completed boolean default false,
  completed_at timestamp,
  time_spent_minutes int,
  recall_quality text check (recall_quality in ('good','okay','struggled')),
  created_at timestamp default now()
);

-- ============================================================
-- 7. JOURNAL ENTRIES
-- ============================================================
create table journal_entries (
  id uuid primary key default gen_random_uuid(),
  topic_id uuid references topics(id),
  entry text,
  created_at timestamp default now()
);

-- ============================================================
-- 8. DEVICE TOKENS (for push notifications)
-- ============================================================
create table device_tokens (
  id uuid primary key default gen_random_uuid(),
  account_id uuid references accounts(id),
  fcm_token text,
  created_at timestamp default now()
);

-- ============================================================
-- 9. NOTIFICATION PREFERENCES
-- ============================================================
create table notification_preferences (
  account_id uuid primary key references accounts(id),
  daily_reminder_enabled boolean default true,
  daily_reminder_time time default '18:00',
  streak_nudge_enabled boolean default true,
  streak_nudge_time time default '21:00'
);

-- ============================================================
-- 10. REFERRAL EVENTS
-- ============================================================
create table referral_events (
  id uuid primary key default gen_random_uuid(),
  referrer_account_id uuid references accounts(id),
  referred_account_id uuid references accounts(id),
  reward_granted boolean default false,
  created_at timestamp default now()
);

-- ============================================================
-- INDEXES (for the queries you'll run most — Due Today, Leaderboard)
-- ============================================================
create index idx_students_class on students(class_id);
create index idx_topics_student on topics(student_id);
create index idx_revisions_topic on revisions(topic_id);
create index idx_revisions_scheduled on revisions(scheduled_date);
create index idx_recall_cards_topic on recall_cards(topic_id);
create index idx_journal_topic on journal_entries(topic_id);

-- ============================================================
-- ROW LEVEL SECURITY — enable + baseline policies
-- ============================================================
alter table accounts enable row level security;
alter table students enable row level security;
alter table topics enable row level security;
alter table recall_cards enable row level security;
alter table revisions enable row level security;
alter table journal_entries enable row level security;
alter table device_tokens enable row level security;
alter table notification_preferences enable row level security;
alter table referral_events enable row level security;

-- Accounts: a user can only see/edit their own account row
create policy "own account" on accounts
  for all using (id = auth.uid());

-- Students: owner (self or parent) has full access to their own student rows
create policy "own students - full access" on students
  for all using (owner_account_id = auth.uid());

-- Students: any student can READ name/streak of others in their own class (leaderboard)
-- NOTE: Supabase RLS is row-level, not column-level — restrict columns via a view in the app layer,
-- e.g. a `leaderboard_view` that only exposes id, name, current_streak, class_id.
create policy "classmates can view for leaderboard" on students
  for select using (
    class_id = (select class_id from students where owner_account_id = auth.uid() limit 1)
  );

-- Topics: only accessible via the owning student's account
create policy "own topics" on topics
  for all using (
    student_id in (select id from students where owner_account_id = auth.uid())
  );

-- Recall cards: same pattern, via topic → student → account
create policy "own recall cards" on recall_cards
  for all using (
    topic_id in (
      select t.id from topics t
      join students s on s.id = t.student_id
      where s.owner_account_id = auth.uid()
    )
  );

-- Revisions: same pattern
create policy "own revisions" on revisions
  for all using (
    topic_id in (
      select t.id from topics t
      join students s on s.id = t.student_id
      where s.owner_account_id = auth.uid()
    )
  );

-- Journal entries: same pattern
create policy "own journal entries" on journal_entries
  for all using (
    topic_id in (
      select t.id from topics t
      join students s on s.id = t.student_id
      where s.owner_account_id = auth.uid()
    )
  );

-- Device tokens: only own account
create policy "own device tokens" on device_tokens
  for all using (account_id = auth.uid());

-- Notification preferences: only own account
create policy "own notification prefs" on notification_preferences
  for all using (account_id = auth.uid());

-- Referral events: visible if you're either party
create policy "own referral events" on referral_events
  for select using (
    referrer_account_id = auth.uid() or referred_account_id = auth.uid()
  );

-- Classes table is safe to leave publicly readable (just school/class names, no personal data)
alter table classes enable row level security;
create policy "anyone can read classes" on classes
  for select using (true);
create policy "anyone can create a class" on classes
  for insert with check (true);

-- ============================================================
-- DONE. Next: set up Supabase Auth (email or phone OTP) in the
-- Supabase dashboard under Authentication → Providers.
-- ============================================================
