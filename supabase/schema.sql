-- NapMap friends leaderboard schema.
--
-- How to run it:
--   1. Open your project at https://supabase.com/dashboard
--   2. Left sidebar -> SQL Editor -> New query
--   3. Paste this whole file and click Run. It is safe to run again.
--   4. Project Settings -> API: copy the Project URL and the anon public key
--      into js/config.js (never the service_role key).
--
-- Model: there is no accounts or groups table. A group is just a shared code; a player is a
-- random UUID kept in the browser. Anonymous visitors may read scores and add their own,
-- but nobody (with the public key) can change or delete a score once it is posted.

create table if not exists public.scores (
  id          bigint generated always as identity primary key,
  group_code  text        not null check (char_length(group_code) between 4 and 12),
  player_id   uuid        not null,
  name        text        not null check (char_length(name) between 1 and 20),
  date_key    int         not null,
  time_ms     int         not null check (time_ms > 0 and time_ms < 86400000),
  hearts_lost smallint    not null check (hearts_lost between 0 and 2),
  created_at  timestamptz not null default now(),
  unique (group_code, player_id, date_key)
);

create index if not exists scores_group_date_idx on public.scores (group_code, date_key);

alter table public.scores enable row level security;

drop policy if exists "anon can read scores" on public.scores;
create policy "anon can read scores" on public.scores
  for select to anon using (true);

drop policy if exists "anon can add scores" on public.scores;
create policy "anon can add scores" on public.scores
  for insert to anon with check (true);

-- Supabase grants broad table rights to anon/authenticated by default; narrow them to read + insert.
-- (No sequence grant is needed: identity columns don't check sequence privileges.)
revoke all on table public.scores from anon, authenticated;
grant select, insert on table public.scores to anon;

-- A second insert for the same (group_code, player_id, date_key) fails with a unique violation,
-- which the REST API returns as HTTP 409. The game treats that as "already posted".
