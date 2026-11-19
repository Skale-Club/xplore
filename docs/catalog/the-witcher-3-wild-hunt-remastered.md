# The Witcher 3 — current PS5 edition and ending routes

## Edition and identity

The catalog entry is `the-witcher-3-wild-hunt-remastered`, canonical title **The Witcher 3: Wild Hunt - Remastered**, PlayStation 5. On November 10, 2026 the [official publisher announcement](https://www.thewitcher.com/gb/en/news/52054/the-witcher-3-the-wild-hunt-remastered-is-available-now) and [PS5 storefront](https://store.playstation.com/en-us/concept/204794/) identify the September 29, 2026 Remastered update/renaming of the Complete Edition. It includes Hearts of Stone and Blood and Wine. Do not create a duplicate Complete Edition campaign for the same product. The future Songs of the Past expansion is excluded.

Current Remastered skill progression uses skill prerequisites and three ranks per skill. Older numerical branch-spending/rank formulas are not copied into the guide. No PS4 trophy auto-pop or save-transfer promise is made.

## Guide scope and spoilers

A follow-up adds 26 dedicated reference articles across essential systems, separate from all tasks and percentages. See [reference guides](reference-guides.md) for the contract, content index, sources and verification. The original walkthrough/trophy/route fields remain unchanged.

Twenty categories contain **227 bilingual tasks: 108 story, 105 side and fourteen collectible/equipment goals**. This is a curated guide, not an enumeration of every secondary quest, card or map marker. It includes the base campaign, both included expansions, twenty-six historical base contracts, five selected Toussaint contracts, selected friend/political/crafting quests, Gwent, fistfights, races and trophy challenges. Modern contract trophy requirements are distinct from the historical quest list; free-DLC/expansion contracts are not silently added to the base trophy requirement.

Fifty-four longer task explanations are optional Details. Neutral route labels and short instructions avoid exposing ending outcomes on the main panel. Plot, dialogue, missability and replay instructions appear only after the user opens Details. Existing completion controls remain separate from Details.

## Eighteen compatible combinations

The existing single route selector stores one of **3 main-story outcomes × 2 Hearts of Stone outcomes × 3 Blood and Wine outcomes**. Labels are Main A/B/C, HoS A/B and BaW A/B/C. Combining all three dimensions prevents a base-story choice from accidentally hiding every expansion branch.

| Dimension | A | B | C |
| --- | --- | --- | --- |
| Main | Ciri witcher | Ciri empress | Ciri does not return |
| Hearts of Stone | Save Olgierd | Allow the pact | — |
| Blood and Wine | Sisters reconcile alive | Both sisters die | Prison; Anna alive, Syanna dead |

This table is documentation for maintainers; the app reveals outcomes through optional Details. The eighteen combinations do not claim every romance, political, ruler, guest or local quest permutation. Each outcome has a reproducible sufficient path rather than claiming its choices are the only possible method.

All five conditional Blood and Wine quests belong to the alternative pool. A uses Beyond Hill and Dale plus Pomp and Strange Circumstance. B uses Blood Simple, What Lies Unseen and Pomp and Strange Circumstance. C uses Beyond Hill and Dale plus Burlap Is the New Stripe. The Night of Long Fangs, Tesham Mutna and Be It Ever So Humble remain shared. Unselected incompatible tasks do not count toward the selected route's completion.

Root-authored private decision goals appear before the affected quests; early political preparation appears at the beginning of Novigrad. Each combined route points to the shared early-save planning checkpoint. The game has no chapter selector that rebuilds prior decisions: use suitable manual saves or another campaign. A pre-Isle save cannot repair a political or ally prerequisite already failed earlier. Xplore checkmarks record guide coverage across replays, not separate save files or playthrough histories.

## Independent decision audit

Main A uses all available supportive Ciri choices and skips Emhyr. Main B supports Ciri, visits Emhyr/refuses payment, preserves the early political chain, negotiates with Dijkstra in Blindingly Obvious, completes Reason of State and protects Roche/Ves/Thaler so Nilfgaard wins. Main C deliberately chooses the four available negative decisions and skips Emhyr. Its epilogue does not prove Geralt's death.

HoS A includes Shani/Professor Shakeslock before the temple and the timed water-reflection solution, including Aard on the cracked fountain wall. HoS B permits O'Dimm's pact and resolves the reward conversation; a specific reward is not required.

BaW A includes all governess journal entries, Syanna's background, the ribbon, Dettlaff's defeat, the fifth-victim investigation and the forgiveness dialogue before Damien's ceremony. The ribbon alone does not ensure reconciliation. B deliberately follows the Unseen Elder path and the fatal ceremony. C avoids buying/winning the ribbon, lets Dettlaff leave after Syanna dies and follows the prison/release quest. These branches cannot all be completed in one uninterrupted save.

References: [base ending guide](https://www.pcgamer.com/all-witcher-3-endings-ciri-blood-and-wine-how-many/), [BaW campaign guide](https://www.neoseeker.com/the-witcher-3-blood-and-wine/walkthrough/Campaign_Walkthrough), [BaW outcome conditions](https://www.gosunoob.com/witcher-3/blood-and-wine-endings/), [HoS ending guide](https://www.witcher.tools/endings/hearts-of-stone).

## Trophy and missability audit

The [native PS5 list](https://platpursuit.com/games/NPWR24698_00/) has **79 trophies: 68 bronze, eight silver, two gold and one platinum**. Base game: 53; HoS: thirteen bronze; BaW: thirteen bronze. Every title/tier pair was independently compared against the captured native list. Walked the Path and Munchkin are gold; Card Collector is bronze. Only the other fifty-two base trophies are required for the platinum.

Details distinguish seven required Full Crew allies from optional Letho/Folan/Vigi, peaceful Keira recruitment, the Isle cutoff, the violent Dijkstra exchange, the missable masquerade and High Stakes cards, card-vs-money rewards, base-vs-Skellige Gwent collections and Sven's leshen kill for Woodland Spirit. Even Odds explicitly disables automatic oils, removes mutagens/effects and requires actual contract kills. Expansion guidance covers wedding activities, three auction lots, all painted-world memories, simultaneous nightmare activation, Golyat's eye shot, the pre-Capture the Castle tournament, virtues and vineyard evidence. [Trophy reference](https://www.playstationtrophies.org/game/the-witcher-3-wild-hunt-v2/print-guide/).

## Cover and HowLongToBeat

The [official storefront master](https://image.api.playstation.com/vulcan/ap/rnd/202609/1711/d851895118a16d07706b91e7b69b53ce27531269cad5e968.png) was saved unchanged to `public/covers/the-witcher-3-wild-hunt-remastered.png`, decoded and visually inspected at **1024 × 1024**. Keep the entire image within the standard contain frame; do not crop/stretch non-square covers.

Live canonical lookup matched [HLTB #40171](https://howlongtobeat.com/game?id=40171), current Remastered title, with PS5 among its platforms. Rounded estimates are **57h main / 124h main + extra / 189h completionist**. Earlier Complete Edition release metadata on that same record is not a different campaign. Reject the separate future Songs of the Past record. These are platform-aggregate community estimates, not personal remaining time, PS5-only measurements or a guaranteed platinum duration.

## Validation and delivery

Source schema/UTF-8/ASCII stable keys/EN/PT/fallbacks/cover checks pass. All 22 content-specific route tests pass against the actual importer validator and runtime resolver/filter, exercising every combination, rejecting incompatible Blood and Wine branches, permitting independent completion, keeping the early checkpoint accessible and checking neutral labels/hidden bilingual guidance. A first preview caught a moved goal's stale category reference before any database write; the corrected preview and final tests pass.

Official preview/apply completed without pruning. Full paginated readback confirms exact source/database equality, including all 227 tasks, 54 task Details, eighteen route definitions, 79 trophies, frozen keys/order and HLTB 40171 with 57/124/189h. All 44 previous games, 711 categories, 5,168 tasks, 870 trophy rows, existing GTA V route configuration and all 88 user progress rows are unchanged. Development now has **45 games, 731 categories, 5,395 tasks, 949 trophy rows, 699 task Details plus 21 route guidance entries**. HLTB coverage is **42/45**, retaining the three documented Definitive Edition exceptions. Git whitespace checks pass; existing CRLF notices are informational.

The orchestrator handled edition/provider/artwork decisions, independently reviewed content/native tiers, authored the ending combinations, tested them and performed development import/readback. One gpt-6.1-sol worker researched/drafted only the source JSON. The critical-memory Surface used text edits, small scripts and network I/O only. No installation, full build, dev server, browser automation, push or production deployment is part of this registration.

Started around 04:15 America/New_York on November 10; import/readback finished by 04:39 (~24 minutes versus the 04:55/~40-minute estimate), with documentation/Journal closure afterward. The 22 tests took 0.15s; combined paginated readback, coverage regeneration, static validation and tests took 5.3s. Work remains uncommitted on `feat/game-catalog-content`. Earlier dependency-matched full-build and actual-device layout follow-ups remain pending; these content checks do not claim pixel verification.
