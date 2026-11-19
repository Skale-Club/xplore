-- Optional curated paths. Existing completion rows and IDs remain untouched.
alter table public.games
  add column if not exists walkthrough_routes jsonb not null default '[]'::jsonb;

alter table public.games drop constraint if exists games_walkthrough_routes_array;
alter table public.games add constraint games_walkthrough_routes_array
  check (jsonb_typeof(walkthrough_routes) = 'array');

-- Selection is a preference, not a new playthrough or a reset of achievements.
-- Existing own-row RLS policies apply to this additive column as well.
alter table public.user_game_progress
  add column if not exists selected_route_key text;
