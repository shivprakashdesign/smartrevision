-- Photo → topics capture: one row per syllabus/notes scan.
-- Exists to rate-limit the AI endpoint (it costs real money per call) and to
-- watch extraction quality (topics found vs approved). Written only by the
-- server (service role) — clients never touch it.

create table scan_log (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references accounts(id) on delete cascade,
  topic_count int,
  note text,
  created_at timestamp default now()
);

create index scan_log_account_day_idx on scan_log(account_id, created_at);

-- RLS on with no policies = clients can't read or write; service role bypasses.
alter table scan_log enable row level security;
