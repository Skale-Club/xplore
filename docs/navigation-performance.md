# Navigation response

## Report and cause

On November 10, 2026 the owner clarified that the delay occurs when opening a game or moving between pages. Code inspection found seven sequential data queries in the game page, sequential independent queries on the dashboard, and no route loading boundary. This is evidence of avoidable network waiting, not a measured production latency or proof of a particular hosting/database-region problem.

The separate walkthrough chapter/ending-selection refetch finding is outside this correction. Details, Guides and Trophies are local controls and were not changed.

## Changes

- The game lookup and claims check start together. After the game is found, categories, library selection and trophies load concurrently. Item rows and trophy progress then load concurrently. Item progress waits for the actual item IDs. The seven data requests now form four dependency stages including the initial game lookup, rather than seven serial waits; the authentication check overlaps the first stage.
- Dashboard game rows and categories load concurrently after the library IDs are known. Item/progress dependencies remain intact. Catalog list queries were already parallel and retain that behavior.
- Root `loading.tsx` supplies a synchronous page skeleton without cookies or database work. Its EN/PT status follows the document language, using existing dictionary strings and compiled language selectors. The async header has its own Suspense boundary so it does not hold up the page fallback.
- Small `useLinkStatus` descendants show a fixed-size pending indicator on game cards and header links while navigation is waiting. They respect reduced motion, announce a localized status and do not shift the layout when the state changes. Existing Next Link prefetch remains enabled. Feedback may be skipped when navigation is already ready.

Authenticated reads still use the request's existing server client and row-level security. User filters, selected routes, locale selection, query projections, empty-list behavior, missing-game handling, stored progress and action authorization are preserved. No shared user-data cache, schema change, production write or new dependency is introduced. No personal progress is sent to public caches.

## Verification

Five regression tests execute the actual page functions with controlled asynchronous database doubles. They verify overlapping independent requests, dependent ID scopes, the authenticated user's filters, completed walkthrough/trophy state, dashboard percentages, empty games, missing games and empty libraries. Final run: **5/5 pass in 0.80 seconds**. Tests use the existing TypeScript dependency to transpile server modules; they make no network or database calls.

Targeted ESLint passes for all ten changed/new TSX files and the regression test. The unchanged query blocks extracted from both pages pass strict TypeScript checking against the actual Supabase client and repository database types. A lightweight React server-render check verifies idle/pending status, bilingual skeleton text, reduced-motion classes and fixed indicator sizing; the actual Tailwind compiler verifies both language selectors. All six delegated TSX files also pass syntax transpilation. `git diff --check` passes. React skill review checked server/client boundaries, independent fetching, hook placement and accessibility.

During initial local validation, the critically memory-constrained Surface had about 0.2 GB free. No application server, dependency installation, full build, full test suite or browser automation was run locally. The borrowed runtime differs from the declared dependency-matched release environment. The subsequent authorized release passed the remote dependency-matched full application type-check/build. An authenticated desktop/phone navigation check and live latency measurement remain unperformed. No percentage or millisecond improvement is claimed. The fallback provides feedback while real data is loading; it does not eliminate actual network time.

## Delivery

Initially implemented on `fix/navigation-response`, starting from `dev` at `8a53e0f`, in an isolated worktree without its own node_modules. The owner subsequently authorized publication with “zere o git”. [Release verification](releases/2026-11-10-hollow-navigation.md) records integration, the successful dependency-matched remote application build/TypeScript check, production promotion and public/database checks. The merged fix branch was deleted; Google Identity remains isolated. Authenticated visual navigation and a measured live latency benchmark remain unperformed.

Started around 10:39 America/New_York. Initial target: 11:05, approximately 25 minutes. Code, tests, lint, focused type checking and UI/compiler checks completed by 10:48, followed by Journal closure. One gpt-6.1-sol worker implemented UI feedback; Codex handled query scheduling, integration, independent review and final verification. Targeted tests take approximately one second; focused query type checking takes approximately one second on this machine.
