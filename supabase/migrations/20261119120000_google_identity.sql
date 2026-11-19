-- Google Identity owns login; application UUIDs and progress survive the cutover.
-- Apply to development first. Never replace existing users with Firebase UIDs.
begin;

create table public.app_users (
  id uuid primary key default gen_random_uuid(),
  email text,
  legacy_email_verified boolean not null default false,
  google_project_id text,
  google_subject text,
  created_at timestamptz not null default now(),
  unique (google_project_id, google_subject),
  check ((google_project_id is null) = (google_subject is null))
);
create unique index app_users_email_unique on public.app_users (lower(email)) where email is not null;

-- The legacy UUID remains the canonical app account ID. No progress is copied.
insert into public.app_users (id, email, legacy_email_verified, created_at)
select id, nullif(email, ''), email_confirmed_at is not null, coalesce(created_at, now()) from auth.users;

alter table public.profiles drop constraint profiles_id_fkey;
alter table public.profiles add constraint profiles_id_fkey
  foreign key (id) references public.app_users(id) on delete cascade;
alter table public.games drop constraint games_created_by_fkey;
alter table public.games add constraint games_created_by_fkey
  foreign key (created_by) references public.app_users(id) on delete set null;
alter table public.user_game_progress drop constraint user_game_progress_user_id_fkey;
alter table public.user_game_progress add constraint user_game_progress_user_id_fkey
  foreign key (user_id) references public.app_users(id) on delete cascade;
alter table public.user_item_progress drop constraint user_item_progress_user_id_fkey;
alter table public.user_item_progress add constraint user_item_progress_user_id_fkey
  foreign key (user_id) references public.app_users(id) on delete cascade;
alter table public.user_trophy_progress drop constraint user_trophy_progress_user_id_fkey;
alter table public.user_trophy_progress add constraint user_trophy_progress_user_id_fkey
  foreign key (user_id) references public.app_users(id) on delete cascade;

drop trigger on_auth_user_created on auth.users;
drop function public.handle_new_user();

create table public.app_sessions (
  token_hash text primary key check (token_hash ~ '^[a-f0-9]{64}$'),
  user_id uuid not null references public.app_users(id) on delete cascade,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);
create index app_sessions_user_id_idx on public.app_sessions(user_id);
create index app_sessions_expires_at_idx on public.app_sessions(expires_at);
alter table public.app_users enable row level security;
alter table public.app_sessions enable row level security;
revoke all on public.app_users, public.app_sessions from anon, authenticated;
grant all on public.app_users, public.app_sessions to service_role;

-- Only the server calls this after validating the Google-signed identity token.
-- Email is metadata after binding: subsequent sign-ins use project + subject.
create function public.resolve_google_identity(
  p_project_id text, p_subject text, p_email text, p_name text,
  p_can_link_legacy boolean default false
) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  account public.app_users%rowtype;
  account_id uuid;
begin
  if coalesce(p_project_id, '') = '' or coalesce(p_subject, '') = '' or coalesce(p_email, '') = '' then
    raise exception 'Invalid identity';
  end if;
  -- Serialize both identity and email races, including simultaneous first logins.
  perform pg_advisory_xact_lock(hashtextextended('google:' || p_project_id || ':' || p_subject, 0));
  select * into account from public.app_users
    where google_project_id = p_project_id and google_subject = p_subject;
  if found then return account.id; end if;
  perform pg_advisory_xact_lock(hashtextextended('email:' || lower(p_email), 0));
  select * into account from public.app_users where lower(email) = lower(p_email) for update;
  if found then
    -- A verified Google Gmail identity may recover a verified legacy Gmail account.
    -- Other addresses require a separately reviewed ownership proof; never silently merge.
    if account.google_subject is not null or not account.legacy_email_verified or not p_can_link_legacy then
      raise exception 'ACCOUNT_LINK_REQUIRED' using errcode = 'P0001';
    end if;
    account_id := account.id;
    update public.app_users set google_project_id = p_project_id, google_subject = p_subject
      where id = account_id;
  else
    insert into public.app_users (email, google_project_id, google_subject)
      values (lower(p_email), p_project_id, p_subject) returning id into account_id;
  end if;
  insert into public.profiles (id, display_name)
    values (account_id, coalesce(nullif(p_name, ''), split_part(p_email, '@', 1)))
    on conflict (id) do nothing;
  return account_id;
end;
$$;
revoke all on function public.resolve_google_identity(text, text, text, text, boolean) from public, anon, authenticated;
grant execute on function public.resolve_google_identity(text, text, text, text, boolean) to service_role;

-- Account deletion also removes any retained pre-migration auth record.
create function public.delete_app_account(p_user_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  delete from public.app_users where id = p_user_id;
  delete from auth.users where id = p_user_id;
end;
$$;
revoke all on function public.delete_app_account(uuid) from public, anon, authenticated;
grant execute on function public.delete_app_account(uuid) to service_role;

-- Reject still-valid legacy Supabase Auth JWTs immediately at the data boundary.
-- Existing ownership policies remain permissive; this additional restrictive
-- policy requires the claim minted exclusively by the application server.
do $$
declare table_name text;
begin
  foreach table_name in array array[
    'games', 'checklist_categories', 'checklist_items', 'profiles',
    'user_game_progress', 'user_item_progress', 'trophies', 'user_trophy_progress'
  ] loop
    execute format(
      'create policy google_identity_session on public.%I as restrictive for all to authenticated
       using ((select auth.jwt()->>''xplore_auth'') = ''google-identity-v1'')
       with check ((select auth.jwt()->>''xplore_auth'') = ''google-identity-v1'')', table_name
    );
  end loop;
end;
$$;

create policy google_identity_upload_session on storage.objects as restrictive for all to authenticated
  using (bucket_id <> 'checklist-images' or (select auth.jwt()->>'xplore_auth') = 'google-identity-v1')
  with check (bucket_id <> 'checklist-images' or (select auth.jwt()->>'xplore_auth') = 'google-identity-v1');

commit;
