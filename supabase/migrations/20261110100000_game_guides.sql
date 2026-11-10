-- Optional reference articles; no changes to checklist/trophy progress.
alter table public.games
  add column if not exists guides jsonb not null default '[]'::jsonb;
