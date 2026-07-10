-- SmartRevision — Canonical schools + class restructure
-- Paste this whole file into Supabase → SQL Editor → Run. Requires supabase_schema.sql.
-- Order matters: schools must exist before classes can reference it.
--
-- Replaces the free-text school_name/class_name pair on `classes` with a foreign
-- key into a seeded `schools` table. Free text silently forks the leaderboard:
-- "DPS Gurgaon", "D.P.S. Gurgaon" and "Delhi Public School Gurgaon" each get
-- their own class, each with one lonely student in it.
--
-- Old columns are kept through this deploy so a rollback is a code revert, not
-- a restore. Drop them a release later — see the last section.

create extension if not exists pg_trgm;

-- ============================================================
-- 1. SCHOOLS (seeded from UDISE+; users may add unverified rows)
-- ============================================================
create table if not exists schools (
  id uuid primary key default gen_random_uuid(),
  udise_code text unique,           -- null for user-submitted schools
  name text not null,
  district text,
  state text,
  verified boolean not null default false,
  created_at timestamptz default now(),

  -- Every school in a district shares a district/state, so those disambiguate
  -- nothing in a result list. The grade range and locality do: three "Shri
  -- Machhi Mahajan" schools are told apart by "classes 6–12, Nani Daman".
  grade_from smallint,
  grade_to smallint,
  address text,

  -- What students actually type. UDISE+ stores full legal names, but nobody
  -- searches for "Indian Overseas ... School" — they type IOLF, DPS, KV.
  -- Without this, an acronym search finds nothing and the student adds a
  -- duplicate through the escape hatch.
  aliases text[] not null default '{}',

  -- Case- and punctuation-insensitive identity. "D.P.S." and "DPS" collide
  -- here, which is exactly what we want: the unique index below then stops a
  -- user re-adding a school that already exists under a different spelling.
  name_key text generated always as (
    lower(regexp_replace(name, '[^a-zA-Z0-9]+', '', 'g'))
  ) stored
);

-- `create table if not exists` above is a no-op once the table exists, so any
-- column added after the first run needs its own alter to actually land.
alter table schools add column if not exists aliases text[] not null default '{}';
alter table schools add column if not exists grade_from smallint;
alter table schools add column if not exists grade_to smallint;
alter table schools add column if not exists address text;

-- Two schools may share a name across districts (every district has a
-- "Government High School"), so identity is name + district.
create unique index if not exists idx_schools_identity on schools(name_key, (coalesce(district, '')));
create index if not exists idx_schools_name_trgm on schools using gin (name gin_trgm_ops);
create index if not exists idx_schools_district on schools(district);

-- ============================================================
-- 2. SEARCH (typeahead for the onboarding school step)
-- ============================================================
-- Seeded schools always outrank user-submitted ones, so the canonical spelling
-- is what students see first and the unverified long tail stays out of the way.
-- `create or replace` cannot widen a function's return type, so a signature
-- change has to drop first. Both arities, in case an older one is installed.
drop function if exists search_schools(text, text);
drop function if exists search_schools(text);
drop function if exists search_schools(text, text, smallint);

create function search_schools(
  q text,
  district_hint text default null,
  grade_hint smallint default null
)
returns table (
  id uuid, name text, district text, state text, verified boolean,
  grade_from smallint, grade_to smallint, address text
)
language sql
stable
-- similarity()/pg_trgm may live in `extensions` rather than `public` depending
-- on how the extension was installed. Pin both so resolution can't drift.
set search_path = public, extensions
as $$
  select s.id, s.name, s.district, s.state, s.verified,
         s.grade_from, s.grade_to, s.address
  from schools s
  where (s.name ilike '%' || q || '%'
     or exists (select 1 from unnest(s.aliases) a where a ilike '%' || q || '%'))
    -- Three schools share the "Shri Machhi Mahajan" name and one campus; only
    -- the grade range separates them. A Class 11 student has no use for the
    -- primary school. Schools with no recorded range (user-added) always show.
    and (
      grade_hint is null
      or s.grade_from is null or s.grade_to is null
      or grade_hint between s.grade_from and s.grade_to
    )
  order by
    s.verified desc,
    (s.district is not distinct from district_hint) desc,
    -- A student typing the exact acronym wants that school, not a fuzzy
    -- name match that happens to score well.
    (exists (select 1 from unnest(s.aliases) a where lower(a) = lower(q))) desc,
    similarity(s.name, q) desc,
    s.name asc
  limit 8
$$;

-- ============================================================
-- 3. CLASSES → point at schools
-- ============================================================
alter table classes add column if not exists school_id uuid references schools(id);
alter table classes add column if not exists grade text;
alter table classes add column if not exists section text;

-- No backfill: `classes` was emptied before the UDISE+ seed, so every school
-- row now originates from exactly one place — the seed. Grades are written by
-- the client as bare digits ("11"), never as "Class 11".

create index if not exists idx_classes_school on classes(school_id);
create unique index if not exists idx_classes_identity on classes(school_id, grade, (coalesce(section, '')));

-- ============================================================
-- 4. ROW LEVEL SECURITY
-- ============================================================
alter table schools enable row level security;

-- School names are public data — no personal information.
drop policy if exists "anyone can read schools" on schools;
create policy "anyone can read schools" on schools
  for select using (true);

-- Escape hatch for "can't find my school". Signed-in users may add one, but
-- never a verified one — seeding stays an admin job.
drop policy if exists "authed users can add unverified schools" on schools;
create policy "authed users can add unverified schools" on schools
  for insert with check (auth.uid() is not null and verified = false);

-- Tighten the original wide-open classes insert: signup is authenticated by the
-- time we create a class, so there's no reason to let anonymous callers write.
drop policy if exists "anyone can create a class" on classes;
drop policy if exists "authed users can create a class" on classes;
create policy "authed users can create a class" on classes
  for insert with check (auth.uid() is not null);

-- get_leaderboard(class_id) needs no change: students.class_id is untouched.
-- The legacy free-text columns are dropped separately in
-- supabase_drop_legacy_class_columns.sql, once a release has shipped with
-- nothing writing them.
