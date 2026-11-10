<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Project conventions (Xplore)

<!-- journal-protocol:v1 -->
## App Journal and backlog

- Project home: https://app.notion.com/p/413b7a6861218167b6bfd56535b60aa8
- Journal hub: https://app.notion.com/p/413b7a686121810792b5f3100ca1a56c
- Journal Entries: collection://595283c9-5b88-4d7e-a0b1-a2873c646ab9
- Latest view: view://15f984b2-c333-4584-8987-a618a4a2e6b9
- Entry prefix: XPL
- Backlog: https://app.notion.com/p/413b7a686121813f8762d9040f63a9f4
- Backlog Items: collection://fbb667cb-0b0a-40b4-b949-2d6a3490f002
- Protocol: https://app.notion.com/p/411b7a68612181b3ac36f4ce2b2c3850

Use the `app-journal` skill. Read Identity and Current State, then the latest 20
entry titles/summaries in view mode. Record each logical change and update Current
State when needed. If Notion is unavailable, use `docs/journal/PENDING-NOTION.md`.
Backlog capture does not authorize implementation or provider account connections.
<!-- /journal-protocol:v1 -->

Xplore is a bilingual game‑completion checklist tracker (Next.js 16 + Supabase). See
`README.md` for the full overview. When working in this repo:

- **Middleware is `src/proxy.ts`** (Next 16 rename). It must sit next to `app/`, which here
  is `src/app` — Next silently ignores a `proxy.ts` at the repo root when `src/` is used,
  leaving every route ungated. Auth gating lives in `src/lib/supabase/proxy.ts`. Keep `/api`,
  `sw.js`, `manifest.webmanifest`, and `offline.html` out of the login‑redirect path.
- **Supabase clients**: `src/lib/supabase/server.ts` (Server Components/actions, RLS),
  `client.ts` (browser), and `admin.ts` (`SUPABASE_SECRET_KEY`, **server‑only**, bypasses
  RLS — never import into a client component). The auth cookies are **HttpOnly**
  (`cookie-options.ts`), so the browser client never has a session and runs as anon: anything
  that needs the user's identity must go through the server.
- **i18n is mandatory for user‑facing text.** UI strings go in `src/i18n/dictionaries/{en,pt}.ts`
  (`en.ts` is the type source of truth). Server pages call `getLocale()` + `getDictionary()`
  and pass strings to client components as props. Localizable **content** is stored in JSONB
  `*_i18n` columns and read with `pick(row.field_i18n, locale, row.field)`. New content writes
  should set both the plain fallback column and `{ [locale]: value }`.
- **Migrations**: add SQL to `supabase/migrations/` and apply with
  `supabase db push --linked`. Keep `src/types/supabase.ts` in sync by hand.
- **Verify before shipping**: `npx tsc --noEmit`, `npm run lint`, `npm run build` must pass.
- **Curated game content lives in `content/games/<slug>.json`** and is synced with
  `scripts/games/sync.mjs` (npm: `games:export` / `games:import`). This is the official way
  to add or edit a seeded game — never re‑create one by hand. Each category/item carries a
  stable `key`; the importer upserts by `(parent, key)`, so ids (and therefore
  `user_*_progress`) survive re‑imports. `key` is **frozen** once assigned: edit titles
  freely, never edit keys. Always `games:import -- <slug> --dry-run` first; `--prune` deletes
  DB rows absent from the file (destructive — removes their user progress).
- **Category kinds**: `checklist_categories.kind` is `story` (default), `side` or
  `collectible`; in a content file set `"kind": "side"` on a category (omit for story). The
  walkthrough groups the chapter index by kind (headings only when a game mixes kinds),
  numbers only story chapters, shows story progress in the header ring with the 100% total
  beside it, and keeps "Next up", resume-where-you-left-off and the chapter auto-advance on
  story chapters (`storyChapters()` in `src/lib/walkthrough.ts`).
- **Cover artwork**: always prioritize square (1:1) covers when available. Prefer
  official square cover art or the game's store icon, keep the artwork's proportions,
  and store it in `public/covers/<slug>.png`. When a square asset is unavailable,
  use the best available cover in its original proportions.
  The visible cover must fit entirely inside the app's standard frame using
  `object-contain`: preserve its original aspect ratio without stretching or
  cropping any artwork or text, including for portrait and landscape covers.
- **Walkthrough navigation**: desktop sidebar and mobile drawer both search chapter
  and task titles. Task results open the containing chapter and reveal/highlight
  the task, including completed tasks hidden by the current filter. Returning from
  extras restores the last story chapter and scroll position; device storage is
  optional. Opening navigation, details or media cancels pending auto-advance.
- **Optional step details**: `checklist_items.details` / `details_i18n` hold longer
  plain-text guidance separate from the short description. Treat this guidance
  as spoilers: keep it hidden by default and reveal it only after an explicit
  click on Details. Never show it inline, as a preview or in a hover tooltip.
  The Details button and
  media controls never toggle completion. Phone layouts stack text above media.
  Content files may omit details to preserve owner edits; explicit `details: null`
  clears the guidance and its translations. The owner can edit guidance per locale.
- **Alternate endings**: optional curated `routes` are stored in
  `games.walkthrough_routes`; see `docs/catalog/alternate-endings.md`. References
  use frozen category+item keys. Shared tasks plus only the selected branch count
  or appear. Keep prerequisites, decisions and replay/save rules in hidden EN/PT
  Route Details, including the earliest replay point and continuous replay rules
  (especially Detroit). Checkpoint links navigate the guide only. Shared coverage
  survives switching; use distinct task keys for actions that must be repeated.
  Never infer an ending from a legacy generic checkbox or reset other progress.
  Selection persists on the user's library row. Missing routes preserves stored
  configuration; explicit null/[] clears it. Validate references before import;
  export must preserve stable keys rather than regenerate them from renamed titles.
- **Step media**: `checklist_items.image_url` may be an image or a YouTube link; YouTube links
  render the video's own thumbnail and play in the no-cookie embed (`step-media.tsx`). Never
  copy screenshots from other sites into the project.
- **Reference guides**: complex games can have a separate Guides tab, independent
  from walkthrough tasks, trophies and all progress percentages. Curated top-level
  `guides` is an ordered array of stable-key articles with `topic`, bilingual
  `title`, `summary`, `body` and matching `*_i18n` fields; English fallbacks must
  match EN. Store it in `games.guides`; see `docs/catalog/reference-guides.md`.
  Omission preserves existing guides; explicit null/[] clears them. Validate before
  import and preserve guide keys/order during export. Search title and safe summary
  only, with topic filters; never search or preview the body. Full plain-text help
  opens only on explicit Read guide activation. Keep walkthrough state when switching
  tabs, cancel pending chapter advancement and pause hidden walkthrough shortcuts.
- **HowLongToBeat completion times**: `games.hltb_id` / `hltb_main_hours` /
  `hltb_main_extra_hours` / `hltb_completionist_hours` are enriched by default for every
  game by the importer
  (`scripts/games/hltb.mjs`, via the unofficial `hltb-client` package) and cached back into
  the content file — the app never calls HLTB at request time. A game already carrying
  a valid ID and positive finite times is skipped on future imports; null/missing/zero-only
  caches retry. Match exact normalized titles and platform, preserving edition qualifiers
  and rejecting ambiguous names. The lookup deadline is about ten seconds; failures
  preserve good file/DB caches. Pass `--refresh-hltb` to re-fetch; `--skip-hltb` is only an
  explicit offline/test exception. Record the matched source/edition or unavailable
  exception in import notes. Whole-game community estimates cannot give precise remaining
  hours from checkbox counts. Never substitute a different edition for a missing match.
- **Trophies** (`trophies` / `user_trophy_progress` tables) are a second, **unintegrated**
  system alongside the detonado checklist — own tables, own RLS, own progress bar and UI tab
  ("Troféus"/"Trophies" next to "Detonado"/"Walkthrough" on the game page). A curated game's
  optional top-level `trophies: [{ key, title, title_i18n, description, description_i18n,
  tier }]` array in `content/games/<slug>.json` is a **sibling** of `categories`, not nested
  inside it, and follows the same frozen-`key` upsert contract via `games:import`. Unlike
  HLTB, trophy tiers are always curator-entered by hand — platform trophy APIs (PSN/Xbox/
  Steam) require a per-user authenticated session, so there's no "look up by title" endpoint
  to automate against. `tier` is one of `bronze`/`silver`/`gold`/`platinum`.
- **Editing curated content in place** (don't re‑create a seeded game) preserves users'
  progress — re‑creating changes the row ids and wipes existing `user_*_progress`.
- **Per‑step images**: `checklist_items.image_url` (nullable) holds an optional image for a
  step. Files live in the public Storage bucket `checklist-images` under
  `{uid}/{gameId}/{itemId}/…` (storage RLS restricts writes to the owner's uid folder).
  The bytes go **client‑side** (`item-image.tsx`) because Server Actions cap bodies at
  ~1MB, but since the browser client has no session (HttpOnly cookies) it can't upload under
  RLS itself: `createItemImageUploadAction` checks the caller owns the item's game, picks the
  path and returns a signed upload token (`createSignedUploadUrl`), and the browser sends the
  file with `uploadToSignedUrl`. The resulting public URL is persisted by
  `setItemImageAction`. The
  importer only touches `image_url` when a content file explicitly includes the field, so
  UI‑uploaded images survive `games:import`.
