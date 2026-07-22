-- Step 3 of photo → plan: connect daily topics to their plan chapter, and
-- split the AI-usage log by kind so syllabus scans and sub-topic suggestions
-- get separate daily caps.

-- A topic logged from the plan remembers its chapter (drives the chapter's
-- pending → started status and the plan progress view). Nullable: topics
-- created the manual way have no chapter.
alter table topics
  add column if not exists plan_item_id uuid references plan_items(id) on delete set null;

create index if not exists topics_plan_item_idx on topics(plan_item_id);

-- scan_log now logs both endpoint kinds: 'scan' (photo, expensive) and
-- 'suggest' (text-only sub-topic suggestions, cheap, higher cap).
alter table scan_log
  add column if not exists kind text not null default 'scan';
