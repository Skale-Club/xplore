# Google Identity and session migration

## Current implementation

Xplore accepts Google sign-in through Firebase Authentication. The browser SDK uses
in-memory persistence and sends its Firebase ID token to `POST /api/auth/identity` as
`{ "idToken": "…" }`. The server requires the exact `APP_ORIGIN` and JSON content type,
limits the request body, and verifies the Firebase token signature with Google's Secure
Token JWKs. Verification pins RS256, Firebase project audience and issuer, Google provider,
verified email, and a recent authentication time. Firebase's documented `iss` and `aud`
checks are described in [Firebase ID token verification](https://firebase.google.com/docs/auth/admin/verify-id-tokens).

The app account UUID remains canonical. `app_users` retains legacy UUIDs so profiles,
game ownership, and progress rows keep their owners. The verified Firebase project and
subject are bound to that UUID; the Firebase subject is never substituted for the app ID.
Only a verified Gmail address can automatically bind an unlinked legacy account, and
only if its legacy email was verified. Other legacy addresses require a separately
reviewed ownership binding. Do not promise automatic recovery for every old email.

After identity resolution the server creates a cryptographically random opaque session
token. The browser receives only the `xplore_session` HttpOnly, SameSite=Lax cookie; the
database stores its SHA-256 hash with a 30-day expiry. The server validates the hash and
expiry on requests. Logout revokes the row; the daily maintenance cron removes expired rows. The Firebase token and any Supabase signing
material never become the application session cookie.

Server-side Supabase queries mint a 60-second HS256 JWT with the canonical UUID as `sub`
and the `authenticated` role. This lets PostgREST and Storage continue applying the existing
RLS policies. Additional restrictive policies require its server-minted
`xplore_auth=google-identity-v1` claim, so a still-valid legacy Supabase Auth token cannot
access application tables after cutover. This JWT is generated and used only on the server; it is not the Xplore app
session. `SUPABASE_JWT_SECRET` must be the project's currently valid HS256 JWT signing
secret accepted by its APIs. Supabase documents JWT signing and RLS in its
[JWT guide](https://supabase.com/docs/guides/auth/jwts) and
[signing keys guide](https://supabase.com/docs/guides/auth/signing-keys). The latter notes
the legacy shared JWT secret is retained for backward compatibility; this implementation
depends on that signing mode and must be revisited if the project stops accepting it.

The browser Supabase client remains anonymous and is used for signed image uploads only.
The service-role `SUPABASE_SECRET_KEY` is server-only and is used for session/account
operations. It bypasses RLS and must never be imported by client code. No SMS login is
implemented.

## Environment configuration

Set these values separately for development and production. Do not put private keys in
`NEXT_PUBLIC_` variables.

| Variable | Purpose |
| --- | --- |
| `APP_ORIGIN` | Exact origin allowed by the identity endpoint, including scheme and port when applicable; no path or trailing slash |
| `NEXT_PUBLIC_FIREBASE_API_KEY` | Firebase client configuration |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | Firebase client configuration |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | Project ID used as the Firebase token audience and issuer project |
| `SUPABASE_JWT_SECRET` | Server-only, currently accepted HS256 signing secret used for 60-second database JWTs |
| `SUPABASE_SECRET_KEY` | Existing server-only service-role key for session/account database operations |
| `NEXT_PUBLIC_SUPABASE_URL` | Existing Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Existing public Supabase publishable key |

No secret or environment value is recorded in this document. Firebase client values are
public configuration, but production Firebase authorized domains and Google provider
settings still need to match the deployed origin.

## Migration and rollout status

`supabase/migrations/20261119120000_google_identity.sql` is **not yet applied**. No Firebase
production configuration has been changed and production has not been migrated. The ignored
local task environment reuses the existing Xpot Google/Firebase public client configuration
with the owner's approval; `SUPABASE_JWT_SECRET` is still missing. Treat this
as development work until a separate production cutover is explicitly approved by the owner.

### Development-first checks

1. Confirm the development Supabase project and Firebase project are the intended ones.
2. Configure the development environment variables and exact development `APP_ORIGIN`.
3. Apply the migration to development only and inspect that legacy UUIDs and progress remain.
4. Build with the locked dependencies and run `npm run test:auth` on Node 22.18+ or 24.
   The auth tests use PGlite and do not require network access.
5. In a real development browser, smoke-test two distinct users: existing verified Gmail,
   new Google account, an unverified/other legacy address that needs reviewed linking,
   progress ownership, logout/session revocation, and account deletion. Confirm user A
   cannot read or change user B's progress and signed image upload remains owner-scoped.
6. Do not release until build, targeted tests, and the two-user browser smoke test pass.

### Validation completed on 2026-11-09

- Eight targeted auth tests passed, including real PostgreSQL migrations/RLS in PGlite,
  legacy UUID/progress preservation, old-token rejection, fresh account provisioning,
  cross-user isolation, Storage write ownership, and deletion/session expiry (~3.5–5.7 seconds).
- The auth backend/client helper TypeScript subset passed with existing shared tools.
- ESLint passed for changed TypeScript/TSX files and auth tests.
- npm Arborist validated all 777 lockfile packages with zero required dependency errors.
- A read-only legacy account preflight found two accounts, both confirmed Gmail; neither
  needs a manual identity binding under the implemented recovery rules. No identities,
  email addresses, or secrets are recorded here.
- Full project typecheck/build and real Firebase/browser smoke checks remain pending.
  The Surface was in critical memory mode; no dev server, full build, browser automation,
  or dependency installation was started. Exact locked dependencies must be installed on
  a machine with sufficient memory before release. Existing shared tools used Next 16.2.6
  and Supabase JS 2.101.1; the project remains pinned to its own locked versions.

These checks validate the local implementation; they do not prove a deployed login flow.

### Production cutover checklist

Perform each item only after development validation and with the owner's explicit OK:

1. Take and verify a restorable production database backup. Record the current deployment,
   migration state, environment configuration, and a rollback owner/runbook.
2. Confirm Google provider settings, production authorized domains, exact `APP_ORIGIN`,
   and availability of the valid Supabase HS256 signing key before changing production.
3. Use a maintenance window: the migration blocks old tokens and is incompatible with
   the old application. Apply it and deploy the compatible application in a controlled sequence.
   Smoke-test existing and new accounts, RLS isolation, progress, account deletion, and
   logout before continuing.
4. At cutover, disable the Supabase password provider and revoke legacy Supabase sessions
   so removed password login cannot continue to authorize requests.
5. Keep `auth.users` records through the agreed rollback period. The explicit
   `delete_app_account` RPC removes both the app account and its retained auth record when
   a user requests deletion; do not bulk-delete legacy records during the migration.
6. Monitor sign-in failures and session/RLS errors. If rollback is needed, restore the
   verified database backup and redeploy the recorded prior application/configuration;
   restore the prior auth-provider/session state as part of that rollback. Do not improvise
   reverse foreign-key edits against live user data.
7. After the owner confirms the rollback window has ended, decide separately whether any
   retained auth records or compatibility code can be removed.

The backup, rollback plan, and explicit owner approval are prerequisites to every
production step. This document does not authorize or perform a production change.
