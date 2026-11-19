# Reference guides for complex games

## Player behavior

Guides are a third, optional game-page tab alongside Walkthrough and Trophies. Only games with valid guide articles show it. It is a read-only reference library: no completion checkbox, progress row, achievement implication or contribution to any percentage. A player can consult help during a mission and switch directly back without resetting the mounted walkthrough's chapter, filters or completion state. Tab interaction cancels a pending chapter-complete hop; global walkthrough shortcuts are inactive while another tab is selected.

Search matches localized titles and safe summaries, ignoring case and accents. A topic selector combines with search. Full bodies may contain mechanic details or spoilers, so they are excluded from search and absent from the rendered dialog until explicit Read guide activation. The article is plain text: no HTML execution, Markdown injection, preview or hover disclosure. Dialog close/Escape returns focus to its trigger. Tabs support arrows/Home/End, have unique accessible relationships across mounted toolbar copies and wrap within the available phone width. Real device pixels remain a release check.

## Curated contract

Optional top-level `guides` maps to `games.guides` (JSONB, non-null default empty array). Each ordered article has:

```json
{
  "key": "refill-potions-and-bombs",
  "topic": "alchemy",
  "title": "Refill potions and bombs",
  "title_i18n": { "en": "Refill potions and bombs", "pt": "Repor poções e bombas" },
  "summary": "Craft once, then restore charges.",
  "summary_i18n": { "en": "Craft once, then restore charges.", "pt": "Fabrique uma vez e depois recupere cargas." },
  "body": "Full plain-text instructions.",
  "body_i18n": { "en": "Full plain-text instructions.", "pt": "Instruções completas em texto simples." }
}
```

Keys are unique stable kebab-case identifiers; do not rename them when editing titles. Topics: basics, combat, equipment, alchemy, exploration, gwent, progression. EN/PT text is mandatory and nonblank, with fallback identical to EN. Import validation runs on all selected guide documents before file-cache/database writes. Omitted guides preserve stored content, while null or [] explicitly clears it. Official export preserves the article keys, order and all translations. Invalid stored entries are ignored safely by the reader. No existing task or trophy key is repurposed as a guide.

The additive development migration is `20261110100000_game_guides.sql`; it changes only the optional game-content column, not authentication, RLS or progress tables. Production still requires the pending details/routes migrations as well as this migration before the corresponding code is released. No production migration or publication occurred here.

## The Witcher 3 initial library

Detroit: Become Human adds a second library of eight articles covering QTE difficulty, continuous saved replay, flowcharts, magazine branches, trophy cleanup, Connor/Hank variables, coverage versus console saves and the separate eight-death challenge. Its content audit is in [detroit-become-human.md](detroit-become-human.md). Reference coverage now contains 34 articles across these two games; it remains independent from task/route/trophy percentages.

The current PS5 Remastered entry has **26 bilingual articles in all seven topics**, separate from its unchanged 227 tasks, 54 task Details, eighteen ending combinations and 79 trophies.

| Topic | Articles |
| --- | --- |
| Basics | First hours; manual saves/difficulty; following objectives; weight/money; diagnosing a blocked quest |
| Combat | Defense/openings; five Signs; preparing contracts; spectral-enemy mechanics |
| Alchemy | Healing; refill charges; toxicity; formulas and upgrades |
| Equipment | Compare gear; crafting/dismantling; repairs/slots; school sets |
| Progression | Current skills/mutagens; respec; expansion order; Blood and Wine mutations |
| Exploration | Useful markers/Places of Power/nests; travel/diving/underwater tools |
| Gwent | Rounds/passing; focused legal decks; limited collection opportunities |

Instructions are original practical explanations with ordered actions and common failure checks. Guide titles/summaries do not reveal final outcomes; existing ending decisions remain in optional walkthrough Route Details. Scope is essential systems/help, not an encyclopedic item location or build database.

The current tree uses prerequisite skills and three ranks; no obsolete numerical row gates or build-stat formulas are promised. Difficulty-specific healing distinguishes meditation from consumable refill. Automatic oils are convenient generally but prohibited by Even Odds. Guides separate formula ownership, first crafting, refill and upgrade tiers; ordinary colored mutagens, monster ingredients and mutation research; crafting versus repair versus cosmetic Reforge; base Gwent collection versus expansion deck. The recommended base→HoS→BaW order is explicitly a recommendation, not an enforced quest sequence. No fixed merchant stock, prices, rate of healing or universally optimal build is assumed.

Research checked November 10, 2026: [official Remastered changes](https://www.thewitcher.com/us/en/news/52041/see-whats-new-in-the-witcher-3-wild-hunt-remastered), [official 5.01 fixes](https://www.thewitcher.com/us/en/news/52085/patch-5-01-for-the-witcher-3-wild-hunt-remastered-is-live), [original publisher manual](https://cdn-l-thewitcher.cdprojektred.com/media/TW3/Pdf/Manuals/PC/The_Witcher_3_Wild_Hunt_Game_Manual_PC_EN.pdf), [in-game tutorial reference](https://witcher3.gameslantern.com/tutorials), [legacy mechanics reference](https://www.gamebanshee.com/thewitcher3/walkthrough/introduction.php), [craftsmen reference](https://primagames.com/eguides/the-witcher-3-wild-hunt-the-complete-edition-eguide/training/armorers-and-blacksmiths), [Gwent rules](https://witcher.fandom.com/wiki/Gwent), [respec](https://www.gosunoob.com/witcher-3/skill-reset/), [mutation unlock](https://www.witcher.tools/quests/turn-and-face-the-strange), and the existing native trophy/ending audit in `the-witcher-3-wild-hunt-remastered.md`. Legacy references do not override current publisher skill/option changes.

## Evidence and limits

At the initial Witcher guide implementation, the official development migration, preview and import completed without pruning. Full paginated comparison confirmed all 45 existing game IDs, 731 categories, 5,395 tasks, 949 trophies and all 88 progress rows unchanged, including every pre-existing Witcher game field other than the new guides array. All 26 stored articles matched source exactly. Catalog and HLTB totals at that checkpoint were 45 games and 42/45 caches. Export round-trip retained all guides, eighteen routes and every frozen category/item key, then the original source formatting was restored. Detroit's later registration raises these current totals as documented in its own audit.

Eight pure tests cover import preservation/clear semantics, keys/localization, invalid content, all topics, accent search, body exclusion and combined filtering. React/BaseUI/JSDOM checks cover three tabs, keyboard/focus, unique IDs, persistent walkthrough state, explicit hidden-body dialogs, literal HTML, no checkboxes and search/topic controls. An independent flow using the actual Walkthrough component verifies completion→Guides→Details→Walkthrough, cancellation past the 2.2-second hop deadline, global shortcut isolation and restored shortcuts on return. These checks verify behavior, not phone/desktop pixels. Targeted lint/syntax checks and existing route UI regression checks are also recorded in the Journal.

Focused TypeScript checks for the new guide domain, both dictionaries and database types passed with a 128MB heap cap. These limited checks are distinct from the outstanding full application type-check/build.

One gpt-6.1-sol worker implemented the schema/pipeline/viewer and initial tests. The orchestrator researched/wrote all articles, reviewed the diff/React behavior, integrated navigation cancellation, applied development operations and independently reran the checks. Critical-memory Surface constraints preclude a full dependency-matched application type-check/build or browser automation. The existing borrowed cache/Next version limitation remains; no dependencies were installed or other processes terminated.

Started about 04:41 America/New_York on November 10, with an initial 05:05/~25-minute estimate; documentation/Journal closure finished around 04:58 (~17 minutes). The official preview took 5.3s, migration plus baseline snapshot 7.3s, pure tests 0.31s, guide DOM about 7s, actual integrated flow about 7s and focused TypeScript 1.85s. Final evidence is also in the Journal; local work remains uncommitted/unpublished.
