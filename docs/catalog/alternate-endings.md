# Alternate endings and replay routes

## Player behavior

Branching games offer a route selector before the chapter list. Each route shows common tasks plus its applicable alternatives. Switching preserves all completed tasks, including goals from other endings. This tracks guide coverage across visits/replays, not separate playthroughs or in-game save files. If an action must be performed again, give it a distinct route-specific task key. Never infer a particular ending from an old generic completion checkbox.

Without a selection, only common tasks appear and the app asks the player to choose a route. With a selection, chapter navigation, searches, next step, keyboard movement, bulk actions, story resume and progress denominators all use the same applicable set. The header ring continues to distinguish story from optional goals. The dashboard uses the saved route and hides its completion bar until a route is chosen, avoiding a false finished-game claim. A direct `?route=<key>` overrides the current view; `?route=common` means common-only. Explicit selection saves the preference to the user's library row for cross-device return.

Route prerequisites, choices, consequences and replay instructions are hidden behind Route Details. Use neutral route names when an outcome would be a spoiler. Step Details also stay hidden and are excluded from search. The checkpoint button opens/highlights a referenced guide task even under Hide completed, without changing checkboxes. It navigates the guide only. Chapter/scroll return state is isolated by game and route. Switching cancels queued auto-advance; failed saves restore the selection, URL and progress view.

## Curated source contract

Detroit: Become Human now supplies seven complete selected campaign profiles with hidden decision guidance. The early-ending profile excludes eight inaccessible chapter categories and replaces the ordinary evidence-room path; normal profiles retain all 32 chapter categories. Camp, river and border scenes, machine/deviant choices and incompatible final decisions only count on their eligible profiles. Every profile explains SAVE plus continuous forward replay from the earliest changed prerequisite, rather than a chapter skip. These are seven reproducible combinations, not every global ending or flowchart. See [the Detroit mechanics audit](detroit-become-human.md); thirteen content tests exercise the actual route helpers.

The Witcher 3 registration demonstrates three simultaneous outcome dimensions with the existing single selector: eighteen combinations of Main A/B/C, HoS A/B and BaW A/B/C. Every selected combination includes only its compatible decisions and Blood and Wine quest branches; common tasks remain shared. Neutral labels keep outcomes in optional Details. Political preparation appears early in Novigrad, decision guidance precedes commitment, and every replay link leads to the shared early-save planning goal. This is selected ending coverage, not every romance/political/guest variation or independent save history. See [the edition and mechanics audit](the-witcher-3-wild-hunt-remastered.md). Twenty-two content-specific tests exercise all eighteen combinations with the actual route helpers.

Optional top-level `routes` in `content/games/<slug>.json` is stored in `games.walkthrough_routes`. Games without configuration keep the earlier behavior. Each route has a frozen kebab-case `key` (`common` is reserved), `title`/`title_i18n`, hidden `details`/`details_i18n`, nonempty `item_refs`, and optional `replay_from`. Titles and guidance require EN/PT and exact English fallback.

```json
{
  "routes": [{
    "key": "ending-a",
    "title": "Ending A",
    "title_i18n": { "en": "Ending A", "pt": "Final A" },
    "details": "Replay forward from the earliest changed decision with the required save settings.",
    "details_i18n": {
      "en": "Replay forward from the earliest changed decision with the required save settings.",
      "pt": "Rejogue em ordem desde a primeira decisão alterada com os ajustes de salvamento necessários."
    },
    "item_refs": [{ "category_key": "finale", "item_key": "ending-a-result" }],
    "replay_from": { "category_key": "finale", "item_key": "decision" }
  }]
}
```

The union of all `item_refs` defines the alternative pool. Tasks outside it are common; a selected route includes its own references plus common tasks. A task can belong to several compatible routes. Both category and item keys are required because item keys are only unique within their category. Source category/item order determines reading order. Put unavailable character chapters and incompatible actions in the appropriate route pool, not in common tasks. A replay point must be common or included in its own route.

The importer validates the complete configuration before writing the game: duplicate/reserved keys, translations, guidance and all references. Missing `routes` preserves stored configuration; explicit null/[] clears it. Never prune to update paths. Export now preserves stored frozen category/item/trophy keys, so renamed titles cannot break route references. The current editor can edit task guidance while preserving configuration; full route authoring uses the curated source/import workflow.

Additive development migration: `20261110090000_walkthrough_routes.sql` adds an array-valued JSONB game column and nullable `user_game_progress.selected_route_key`. Existing own-user RLS covers the preference. The server authenticates the caller, validates the key against the actual game and upserts only that caller's library selection. The selection action never writes task/trophy progress.

## GTA V example

The existing native PS5 entry has three neutral Ending A/B/C routes, each with three new independent preparation/play/outcome goals. All 206 original keys/IDs remain; the old generic any-ending checkbox never proves a particular route. Complete source: 15 categories / 215 tasks; selected route: 209 applicable tasks, including 69 editorial story steps. These counts are not the native mission counter.

The [GTA V mission reference](https://www.gtabase.com/grand-theft-auto-v/missions/) distinguishes loading a preserved save after The Big Score from experiencing another finale through Replay Mission. Replay does not replace the original world's ending. Any one finale satisfies campaign completion; all three are optional experiences across replays. Route Details explain choices, consequences and save handling. Shared completed goals may have been earned in another saved world; finish character-dependent activities before a permanent branch or retain an earlier world for them.

## Detroit: Become Human requirements

Detroit motivated the initial feature, which did not register it at that time. The subsequent [Detroit registration](detroit-become-human.md) now supplies seven selected full-campaign profiles with survival, relationship/public-opinion prerequisites and decision/replay instructions. A complete outline is different from enumerating every global flowchart combination; never label the selected profiles exhaustive.

[Detroit's replay roadmap](https://www.powerpyx.com/detroit-become-human-trophy-guide-roadmap/) requires forward play from a changed decision with saving enabled. Skipping to a later chapter loads its previous state instead of carrying the new choices forward. The [chapter walkthrough](https://www.powerpyx.com/detroit-become-human-full-walkthrough-all-chapters/) supplies decision references. Explain this in hidden route guidance and point `replay_from` to the earliest changed prerequisite rather than a false finale shortcut.

## Validation and limits

Eighteen focused route/importer/navigation tests and React/BaseUI/JSDOM checks passed for independent completion, shared coverage, hidden spoilers, checkpoint jumps, failed saves, stale timers, storage isolation and games with no common tasks. Twelve scenarios against the actual Server Action with closed Supabase/Next doubles passed; they are not live RLS tests. Route-domain TypeScript and targeted ESLint passed. Development migration, official content dry-run/apply, full paginated preservation readback and export round-trip passed. All 43 source configurations validate; all 88 starting progress rows are preserved. The development catalog now has 687 categories and 5,062 tasks.

Full and application-scoped type-checks exhausted a 192MB heap cap on the critical-memory Surface. The borrowed test runtime uses Next 16.2.6 versus declared 16.2.10; dependency-matched application type-check/build and actual mobile/desktop pixel checks remain pending on a suitable machine. No server, browser automation, dependency installation, push or deployment occurred.

The temporary checkout `node_modules` junction still targets this chat's `work/tested-dependency-junction` cache. Automatic approval review rejected guarded and literal-path cleanup with the generic reason “blocked by policy”; no further removal method was attempted. Do not treat that borrowed cache as a dependency-matched release environment.

Timing: started around 03:26 America/New_York on November 10 and closed around 03:55 (~29 minutes), ahead of the initial 04:10/~40-minute estimate. Development migration took about 5s, paginated readback about 5s and official export round-trip 1.8s.
