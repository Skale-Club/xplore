import assert from "node:assert/strict";
import { test } from "node:test";
import { readFile, readdir } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";

test("Google cutover preserves UUIDs/progress and enforces identity, session and cross-user boundaries", async () => {
  const db = new PGlite();
  const owner = "11111111-1111-4111-8111-111111111111";
  const other = "22222222-2222-4222-8222-222222222222";
  const external = "33333333-3333-4333-8333-333333333333";
  const unverified = "44444444-4444-4444-8444-444444444444";
  const scalar = async (sql, params = []) => Object.values((await db.query(sql, params)).rows[0])[0];
  const resolve = (subject, email, canLink = true, project = "fake-dev-project") => scalar(
    "select public.resolve_google_identity($1, $2, $3, 'Player', $4)", [project, subject, email, canLink],
  );
  try {
    // Minimal Supabase infrastructure, with actual PostgreSQL RLS and migrations.
    await db.exec(`
      create role anon;
      create role authenticated;
      create role service_role bypassrls;
      create schema auth;
      create table auth.users (id uuid primary key, email text, email_confirmed_at timestamptz, created_at timestamptz not null default now());
      create function auth.uid() returns uuid language sql stable as
        $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
      create function auth.jwt() returns jsonb language sql stable as
        $$ select coalesce(nullif(current_setting('request.jwt.claims', true), ''), '{}')::jsonb $$;
      grant usage on schema auth, public to anon, authenticated, service_role;
      create schema storage;
      create table storage.buckets (id text primary key, name text, public boolean);
      create table storage.objects (id uuid primary key, bucket_id text, name text);
      create function storage.foldername(text) returns text[] language sql as $$ select string_to_array($1, '/') $$;
      alter table storage.objects enable row level security;
      grant usage on schema storage to authenticated;
      grant select, insert, update, delete on storage.objects to authenticated;
    `);
    const migrations = new URL("../../supabase/migrations/", import.meta.url);
    const files = (await readdir(migrations)).filter(name => name.endsWith(".sql")).sort();
    for (const name of files.filter(name => !name.includes("google_identity"))) {
      // gen_random_uuid is built into PostgreSQL; PGlite does not ship pgcrypto.
      await db.exec((await readFile(new URL(name, migrations), "utf8")).replace("create extension if not exists pgcrypto;", ""));
    }
    await db.exec(`
      grant select, insert, update, delete on all tables in schema public to authenticated;
      insert into auth.users (id, email, email_confirmed_at) values
        ('${owner}', 'owner@gmail.com', now()), ('${other}', 'other@gmail.com', now()),
        ('${external}', 'external@example.com', now()), ('${unverified}', 'unverified@gmail.com', null);
      insert into public.games (id, slug, title, platform, created_by)
        values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'fake-game', 'Fake game', 'PC', '${owner}');
      insert into public.checklist_categories (id, game_id, title, order_index)
        values ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'Chapter', 0);
      insert into public.checklist_items (id, category_id, title, order_index)
        values ('cccccccc-cccc-4ccc-8ccc-cccccccccccc', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'Step', 0);
      insert into public.trophies (id, game_id, title, tier)
        values ('dddddddd-dddd-4ddd-8ddd-dddddddddddd', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'Trophy', 'gold');
      insert into public.user_game_progress (user_id, game_id) values ('${owner}', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');
      insert into public.user_item_progress (user_id, item_id, completed) values ('${owner}', 'cccccccc-cccc-4ccc-8ccc-cccccccccccc', true);
      insert into public.user_trophy_progress (user_id, trophy_id, completed) values ('${owner}', 'dddddddd-dddd-4ddd-8ddd-dddddddddddd', true);
    `);
    await db.exec(await readFile(new URL("20261109190000_google_identity.sql", migrations), "utf8"));
    assert.equal(await resolve("firebase-owner", "owner@gmail.com"), owner);
    assert.equal(await resolve("firebase-owner", "changed@gmail.com"), owner);
    assert.equal(await resolve("firebase-owner", "owner@gmail.com"), owner);
    assert.equal(await scalar("select count(*)::int from app_users where id = $1", [owner]), 1);
    assert.equal(await scalar("select completed from user_item_progress where user_id=$1", [owner]), true);
    assert.equal(await scalar("select completed from user_trophy_progress where user_id=$1", [owner]), true);
    assert.equal(await scalar("select count(*)::int from user_game_progress where user_id=$1", [owner]), 1);
    assert.equal(await scalar("select created_by from games where slug='fake-game'"), owner);
    assert.equal(await scalar("select display_name from profiles where id=$1", [owner]), "owner");
    await assert.rejects(resolve("different-subject", "owner@gmail.com"), /ACCOUNT_LINK_REQUIRED/);
    await assert.rejects(resolve("firebase-external", "external@example.com", false), /ACCOUNT_LINK_REQUIRED/);
    await assert.rejects(resolve("firebase-unverified", "unverified@gmail.com"), /ACCOUNT_LINK_REQUIRED/);
    await assert.rejects(resolve("firebase-owner", "owner@gmail.com", true, "another-project"), /ACCOUNT_LINK_REQUIRED/);
    const fresh = await resolve("firebase-new", "new@gmail.com");
    assert.notEqual(fresh, "firebase-new");
    assert.equal(await resolve("firebase-new", "new@gmail.com"), fresh);
    assert.equal(await scalar("select display_name from profiles where id=$1", [fresh]), "Player");
    assert.equal(await scalar("select count(*)::int from auth.users where id=$1", [fresh]), 0);

    // Simulate the authenticated role established by PostgREST from our app UUID.
    await db.exec(`set role authenticated; select set_config('request.jwt.claim.sub', '${owner}', false);`);
    // A legacy token with the right UUID still cannot access application data.
    assert.equal(await scalar("select count(*)::int from games"), 0);
    assert.equal(await scalar("select count(*)::int from user_item_progress"), 0);
    await assert.rejects(db.query("insert into storage.objects values (gen_random_uuid(), 'checklist-images', $1)", [`${owner}/game/item/image.png`]), /row-level security/);
    await db.exec(`select set_config('request.jwt.claims', '{"xplore_auth":"google-identity-v1"}', false);
      select set_config('request.jwt.claim.sub', '${other}', false);`);
    assert.equal(await scalar("select count(*)::int from user_item_progress"), 0);
    assert.equal(await scalar("select count(*)::int from user_trophy_progress"), 0);
    assert.equal(await scalar("select count(*)::int from user_game_progress"), 0);
    await assert.rejects(db.query("insert into storage.objects values (gen_random_uuid(), 'checklist-images', $1)", [`${owner}/game/item/image.png`]), /row-level security/);
    await db.query("insert into storage.objects values (gen_random_uuid(), 'checklist-images', $1)", [`${other}/game/item/image.png`]);
    assert.equal((await db.query("update games set title='Attacker' where slug='fake-game' returning id")).rows.length, 0);
    await assert.rejects(db.query(`insert into user_item_progress (user_id,item_id) values ('${owner}', 'cccccccc-cccc-4ccc-8ccc-cccccccccccc')`), /row-level security/);
    await assert.rejects(db.query("select * from app_sessions"), /permission denied/);
    await assert.rejects(db.query("select * from app_users"), /permission denied/);
    await assert.rejects(resolve("forged", "forged@gmail.com"), /permission denied/);
    await assert.rejects(db.query("select delete_app_account($1)", [owner]), /permission denied/);
    await db.exec(`select set_config('request.jwt.claim.sub', '${owner}', false);`);
    assert.equal(await scalar("select count(*)::int from user_item_progress"), 1);
    assert.equal((await db.query("update games set title='Owner edit' where slug='fake-game' returning id")).rows.length, 1);
    await db.exec("reset role");
    // Opaque sessions expire, revoke, and cascade on account deletion.
    await db.query("insert into app_sessions (token_hash,user_id,expires_at) values ($1,$2,now()+interval '1 day'),($3,$2,now()-interval '1 day')", ["a".repeat(64), owner, "b".repeat(64)]);
    assert.equal(await scalar("select count(*)::int from app_sessions where expires_at > now()"), 1);
    await db.query("delete from app_sessions where token_hash=$1", ["a".repeat(64)]);
    assert.equal(await scalar("select count(*)::int from app_sessions where expires_at > now()"), 0);
    await db.query("select delete_app_account($1)", [owner]);
    for (const table of ["app_users", "profiles", "auth.users"]) {
      assert.equal(await scalar(`select count(*)::int from ${table} where id=$1`, [owner]), 0);
    }
    for (const table of ["app_sessions", "user_game_progress", "user_item_progress", "user_trophy_progress"]) {
      assert.equal(await scalar(`select count(*)::int from ${table} where user_id=$1`, [owner]), 0);
    }
    assert.equal(await scalar("select created_by from games where slug='fake-game'"), null);
  } finally { await db.close(); }
});
