# Xplore

Alternate endings support named walkthrough routes with shared progress, hidden
spoiler guidance and links back to decision/checkpoint tasks. Curators define
feasible paths and save/replay requirements in the content source. See
[Alternate endings and replay routes](docs/catalog/alternate-endings.md).

A bilingual game‑completion **checklist** tracker. Browse a shared catalog of games,
add them to your library, and tick off everything worth doing — grouped into
chapters/phases with optional per‑item tips (e.g. boss strategies, item locations).

Live: **https://xplore-neon.vercel.app**

Project records: [Xplore in Notion](https://app.notion.com/p/413b7a6861218167b6bfd56535b60aa8),
[Journal](https://app.notion.com/p/413b7a686121810792b5f3100ca1a56c) and
[Backlog](https://app.notion.com/p/413b7a686121813f8762d9040f63a9f4).
The backlog includes future achievement catalogs and account-linking research for
RetroAchievements, Steam, PlayStation Trophies and Xbox; those integrations remain
unimplemented and require a separate scope decision.

## Tech stack

- **Next.js 16** (App Router, Turbopack) + **React 19** + **TypeScript**
- **Tailwind CSS v4** + **shadcn** (Base UI variant), **lucide-react** icons, **Geist** font
- **Supabase** — Postgres + Auth, SSR cookie sessions via `@supabase/ssr`
- **PWA** — web app manifest + service worker
- Hosted on **Vercel** (auto‑deploy on push to `main`)

> ⚠️ This repo pins a modified Next.js 16 where "middleware" is renamed **`proxy.ts`** and
> other conventions differ from older Next.js. See `AGENTS.md` — read the guides in
> `node_modules/next/dist/docs/` before changing framework‑level code.

## Features

- **Auth**: email/password sign‑up (email confirmation), login/logout, password
  recovery, and self‑service account deletion.
- **Profiles**: auto‑created on sign‑up; editable display name + avatar on `/account`.
- **Catalog & library**: all authenticated users see the shared catalog; each user adds
  games to their own library and tracks their own progress.
- **Checklists**: game → categories (chapters) → items (title + optional description).
  A searchable **sidebar on desktop and drawer on mobile** shows one chapter at a
  time. Search finds chapter and task names; selecting a task opens its chapter
  and highlights it. The active section stays in the URL (`?c=<id>`). A **Back to
  story** shortcut restores the story chapter and reading position after visiting
  side quests or collectibles.
- **Step guidance**: short descriptions stay visible beside the completion control.
  Optional longer details are spoiler-sensitive: hidden by default and shown only
  after clicking Details, without completing the task. Never preview them inline
  or on hover. Images and
  videos appear below the text on phones. Browsing details, media or the chapter
  drawer cancels pending automatic chapter advancement.
- **Ownership**: only a game's creator can edit its checklist (enforced by RLS + UI).
- **Reference guides**: complex games can offer a separate searchable Guides tab.
  Safe titles/summaries and topic filters help find practical help; full articles
  open only after clicking Read guide. Reading never counts toward completion.
  Switching back retains the walkthrough chapter and its checklist state.
- **Bilingual (EN default / PT)**: the whole UI and all game content are localizable.
- **Theming**: dark by default, with a light‑mode toggle (no flash on load).
- **Covers**: game cover art rendered on cards and the detail page.
- **Keepalive cron**: a daily Vercel Cron pings the DB so the Supabase free tier
  doesn't auto‑pause.

## Getting started

```bash
npm install
npm run dev        # http://localhost:3000
```

Scripts: `dev`, `build`, `start`, `lint`.

### Environment variables (`.env.local`)

| Variable | Scope | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | public | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | public | Supabase anon/publishable key |
| `SUPABASE_SECRET_KEY` | **server only** | Service‑role key (admin client) |
| `SUPABASE_DB_PASSWORD` | server only | DB password for CLI migrations |
| `SUPABASE_PROJECT_REF` | server only | Supabase project ref |
| `CRON_SECRET` | **server only** | Bearer token that guards `/api/cron/keepalive` |

The same variables are configured in Vercel (Production + Development). Never expose
`SUPABASE_SECRET_KEY` or `CRON_SECRET` to the client.

## Routes

| Path | Notes |
| --- | --- |
| `/login`, `/signup`, `/forgot-password`, `/reset-password` | Auth (public) |
| `/auth/confirm`, `/auth/callback` | Email‑link handlers (set session cookies) |
| `/dashboard` | The signed‑in user's library |
| `/games`, `/games/new` | Catalog + create a game |
| `/games/[slug]`, `/games/[slug]/edit` | Game detail (checklist) + owner‑only editor |
| `/account` | Profile + danger zone (delete account) |
| `/api/cron/keepalive` | `GET`, Bearer‑authed; runs daily via `vercel.json` cron |
| `src/proxy.ts` | Auth gating (Next 16's renamed middleware; must sit next to `src/app`) |

## Data model

Migrations live in `supabase/migrations/` (applied with the Supabase CLI:
`supabase db push --linked`).

- `games` — `id, slug, title, title_i18n, platform, cover_url, created_by`
- `checklist_categories` — `id, game_id, title, title_i18n, order_index`
- `checklist_items` — `id, category_id, title, title_i18n, description, description_i18n, order_index`
- `user_game_progress` — `(user_id, game_id)` = a game in a user's library
- `user_item_progress` — `(user_id, item_id, completed, completed_at)`
- `profiles` — `id, display_name, avatar_url` (auto‑created by an `auth.users` insert trigger)

**RLS**: the catalog (`games`, `checklist_categories`, `checklist_items`) is readable by any
authenticated user but writable only by a game's `created_by`; `user_*_progress` and
`profiles` rows are scoped to their owner.

The `*_i18n` columns are JSONB locale maps like `{ "en": "…", "pt": "…" }`. The plain
`title`/`description` columns hold the fallback value (see i18n below).

## Internationalization (`src/i18n/`)

- **Default locale** is English; a `locale` cookie switches to Portuguese. It's a cookie
  (not `localStorage`) so Server Components can read it and render the right language.
- `config.ts` — `locales`, `defaultLocale`, cookie name. `get-locale.ts` reads/validates it.
- `dictionaries/en.ts` is the **source of truth** for the `Dictionary` type; `pt.ts` must
  match its shape. `get-dictionary.ts` maps locale → dictionary and exposes `t()` for
  `{placeholder}` interpolation.
- **UI strings** come from the dictionary. Server pages call `getLocale()` + `getDictionary()`
  and pass strings to client components as props (clients can't call the server helpers).
- **Content** (game/category/item text) is stored bilingually and resolved with
  `pick(row.title_i18n, locale, row.title)`. Official content is fully bilingual;
  user‑created content is single‑language with fallback to whatever exists.
- `LocaleToggle` (header) sets the cookie and calls `router.refresh()`.

## Adding official game content

Curated games (e.g. Metal Gear Solid) live as `content/games/<slug>.json` — full bilingual
`title_i18n`/`description_i18n` for the game, its categories, and its items, each carrying a
stable, frozen `key`. Covers go in `public/covers/<slug>.png`, referenced via `cover_url`.

**Always prioritize square (1:1) covers when available**, preferably official square
cover art or the game's store icon. Preserve the artwork's proportions. When no
square asset is available, use the best available cover in its original proportions.
Inside the standard app frame, always fit the **entire cover** with `object-contain`.
Portrait and landscape covers retain their original aspect ratio without distortion
or cropping the artwork or text.

See [cover artwork sources and checks](docs/catalog/cover-artwork.md) for official
Nintendo square-catalog images, PlayStation Store artwork and fallback validation.

Steps can include optional plain-text `details` and bilingual `details_i18n` fields
for extended guidance. Omitting both preserves existing owner-written guidance on
import. Explicit `details: null` clears both the fallback text and translations.
Owners can add or update guidance in the checklist editor for the current language.

On Node.js 24, run the small navigation/search regression checks with
`npm run test:walkthrough`. UI interaction checks for the drawer, task details,
focus and story return were also run with React and JSDOM; real browser layout
verification should be performed on the desktop before release.

Optional top-level `guides` articles are stored separately in `games.guides`, with
stable keys, seven supported topics and mandatory EN/PT title/summary/body fields.
Omission preserves stored articles; explicit null/[] clears them. The importer
validates all supplied guide documents before writes; export retains their keys.
See `docs/catalog/reference-guides.md`. Run the focused checks with
`node --experimental-strip-types --test tests/game-guides.test.mjs`.

Sync a file to the database with `scripts/games/sync.mjs` (service role, bypasses RLS):

```
npm run games:import -- <slug> --dry-run   # preview
npm run games:import -- <slug>             # apply
```

The importer upserts by `(parent, key)`, so ids — and therefore everyone's saved progress —
survive re-imports. Every game receives HowLongToBeat enrichment by default: exact title
and platform matches with positive finite estimates are cached in the same file. Missing
or unusable caches retry; failed lookups preserve good caches. `--refresh-hltb` rechecks;
`--skip-hltb` is an explicit offline/test exception. Record source/edition or unavailable
exceptions in import notes. These are whole-game community estimates; checkbox counts
cannot yield precise remaining hours. `npm run games:export -- <slug>` bootstraps a file from an
existing DB row. See `AGENTS.md` for the full contract (flags, orphan handling, HLTB caching).

## Deployment

Pushing to `main` triggers a Vercel production deploy. The `dev` branch is kept in sync
and produces preview deploys. Database migrations are applied separately via the Supabase
CLI against the linked project.
