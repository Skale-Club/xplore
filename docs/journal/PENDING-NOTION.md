# Pending Notion journal entries

Journal: https://app.notion.com/p/413b7a686121810792b5f3100ca1a56c

Data source: collection://595283c9-5b88-4d7e-a0b1-a2873c646ab9

Latest: view://15f984b2-c333-4584-8987-a618a4a2e6b9

The original fallback records and verified links from 2026-11-09 are preserved in `2026-11-09-synced.md`.

Append new full entries here only when Notion is unavailable. Preserve any unsynced records until their Notion write and read-back are verified.

## 2026-11-09 — Migrate login to Google Identity Platform

Recorded at: 2026-11-09 17:58 America/New_York.
Target data source: Xplore game tracker Journal (see hub link above).

### Properties

- Title: 2026-11-09 — Migrate login to Google Identity Platform
- Date: 2026-11-09
- Type: Feature
- Area: Auth
- Status: Partial
- Summary: Implement Google-only Firebase sign-in, hashed server sessions and a legacy UUID-preserving RLS migration. Local tests pass; signing-key configuration, development smoke testing and an approved production cutover remain pending.
- Agent: Codex
- Model: Codex session orchestrator; gpt-6-luna auth comparison, client implementation and documentation
- Repo / Branch: vanildodesouzajr/xplore / feat/google-identity
- Commits / PR: Local implementation commit; no push or PR. Resolve with git log on this branch.
- Tests: Eight targeted auth tests PASS (~3.5–5.7s); auth TypeScript subset PASS; changed-file ESLint PASS; lockfile dependency validation PASS; diff whitespace check PASS. Full exact-dependency build/browser flow not run.
- Project: Xplore
- Decision ID: Unassigned until the Journal prefix is configured.
- Decision Status: Owner approved Google-only sign-in and reuse of Xpot's existing Google/Firebase project in chat. Production cutover is not approved.

## Context

The owner requested that Xplore migrate from Supabase password login to Google Identity
in the same pattern as Xpot. The working checkout contains unrelated Zelda work; this
change is isolated under `.worktrees/feat-google-identity`, branched from updated `dev`.
The Surface had 0.2–0.5 GB free RAM, so execution remained light and sequential.

## What changed

Firebase Google popup login uses in-memory persistence and exchanges a verified ID token
for an opaque, hashed, 30-day application session in an HttpOnly cookie. The backend
validates RS256, audience/issuer, Google provider, verified email and recent auth time,
with Xpot's five-minute clock tolerance. Same-origin checks and bounded JSON parsing
protect the login endpoint. Password actions are removed; old routes redirect to login.

The SQL migration bootstraps app_users with existing UUIDs, repoints profile/ownership/
progress foreign keys, and adds private sessions plus service-role-only account RPCs.
Existing ownership RLS remains; server-generated 60-second authenticated JWTs include
an application claim that restrictive policies require. Old Supabase Auth tokens cannot
access app data. Account deletion revokes all sessions and removes retained legacy auth
records. The maintenance cron clears expired sessions. Anonymous signed image uploads
retain their existing server ownership check.

## How it was built

The orchestrator chose the account/session/RLS design, implemented backend and SQL,
reviewed all delegated work and ran final checks. gpt-6-luna compared Xpot and Xplore,
implemented client login/localization and drafted documentation, one task at a time.
Dependencies were pinned using existing lock records; npm Arborist validated the resulting
graph. Two missing optional WASM dependency records in the old lockfile were restored.
No npm installation, dev server, full build, browser automation or production mutation ran.

## Decisions and why

The owner selected Google accounts only, without SMS, and reuse of the existing Xpot
Google/Firebase project. The public client configuration was copied to the ignored task
.env.local; no values were printed or committed. Application UUIDs remain canonical to
preserve profiles and progress. Only confirmed legacy Gmail addresses auto-bind; other
legacy addresses require separately reviewed ownership proof. A read-only preflight
found two current accounts, both confirmed Gmail, and changed no remote state.

## Tests and evidence

Eight offline tests passed using signed test JWTs and a real PostgreSQL engine (PGlite).
They cover forged/expired/wrong-project/provider tokens, origin/body limits, successful
and failed login exchange, canonical JWT subjects, session hashing, migration continuity,
old-token rejection, cross-user RLS, owner-scoped Storage writes, session expiry/revocation and account deletion.
The backend/helper TypeScript subset and changed-file ESLint passed using existing shared
Next 16.2.6 / Supabase JS 2.101.1 tools; exact project dependency verification remains due.
The package lock has 777 packages with zero required dependency errors. The staged patch
passed Gitleaks with no detected secrets. Estimated 35 minutes; local implementation
completed in approximately 27 minutes.

## Not done / risks

SUPABASE_JWT_SECRET is missing locally. It must be an existing, still-accepted HS256
signing secret for the target Supabase project, configured privately in the environment.
No database migration, Google production setting, push, merge or deploy was performed.
The database migration is incompatible with the old app; production needs a maintenance
window, verified backup and restore plan, plus the owner's explicit authorization.
Full locked-dependency typecheck/lint/build and real development browser smoke tests,
including signed image upload, remain pending. Future signing-key changes must account
for this server-side JWT bridge. The Notion entry was not saved remotely.

## Next

Privately configure the accepted signing key; validate against the intended development
database with fake data. Run the exact-dependency checks and two-user browser flow on a
machine with enough RAM. Obtain the owner's explicit approval before production cutover;
follow docs/GOOGLE-IDENTITY.md for backup, rollout, old-session retirement and rollback.
Sync this record to the Xplore Notion Journal using the hub link above.
