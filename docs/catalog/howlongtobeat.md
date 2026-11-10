# HowLongToBeat coverage and import policy

Owner requirement, 2026-11-09: HowLongToBeat enrichment is the default for every
game, not a feature reserved for selected entries. Record an explicit exception
when there is no trustworthy match or the provider is unavailable. Never invent
times or substitute another edition merely to fill the panel.

## Data flow

1. Curated content is imported through scripts/games/sync.mjs.
2. Games without a usable cache are searched by title, then checked against the
   exact normalized name and platform. Edition qualifiers remain significant.
   A documented curator alias may supply a cache after independent publisher,
   platform and release-year verification; see ocarina-remake-hltb-alias.md.
3. Save only a valid provider ID and positive finite hour values to the existing
   four hltb fields in the content file and games row.
4. The application reads those cached fields. It does not call HLTB while a user
   opens a game, and it does not require linking a personal HLTB account.
5. A failed lookup remains retryable and preserves previously valid cache data.
   Use --refresh-hltb deliberately to update valid cached values. --skip-hltb is
   an explicit offline/test exception, not the routine catalog workflow.

The existing unofficial hltb-client 1.0.1 used the obsolete /api/bleed endpoint,
which returned 404. Version 1.1.0 uses the current search route. The dependency and
lockfile were updated with the published integrity hash; no install scripts or
new browser dependencies were run. The wrapper has a ten-second logical deadline
and configures the same HTTP timeout. The library does not expose cancellation
of an operation already in progress after the wrapper deadline.

Live verification also found that requesting 50 candidates returned an empty
result while five returned the expected game. The wrapper therefore requests
five candidates and rejects ambiguous or mismatched titles/platforms. A real
collision exists between PlayStation Metal Gear Solid and its Game Boy Color
namesake; exact title alone is insufficient.

## Verified source matches

Retrieved on 2026-11-09–2026-11-10. Rounded community whole-game estimates in hours may aggregate the platforms listed by HLTB. The sequential queue and per-game notes record edition checks; these are not personal remaining-time or guaranteed platinum-time estimates. Red Dead Redemption caches the base game; bundled Undead Nightmare remains a separate provider estimate.

| Catalog entry | HLTB source | Main | Main + Extra | Completionist |
| --- | --- | --- | --- | --- |
| Black Myth: Wukong — PlayStation 5 | [82089](https://howlongtobeat.com/game?id=82089) | 38 | 48 | 67 |
| Detroit: Become Human — PlayStation 4 | [31388](https://howlongtobeat.com/game?id=31388) | 12 | 16 | 32 |
| Fallout 4: Game of the Year Edition — PlayStation 5 | [49483](https://howlongtobeat.com/game?id=49483) | 35 | 109 | 205 |
| Firewatch — PlayStation 4 | [26806](https://howlongtobeat.com/game?id=26806) | 4 | 5 | 5 |
| Grand Theft Auto 2 — PC | [4059](https://howlongtobeat.com/game?id=4059) | 12 | 20 | 27 |
| Grand Theft Auto Advance — Game Boy Advance | [4060](https://howlongtobeat.com/game?id=4060) | 7 | 12 | 18 |
| Grand Theft Auto: Chinatown Wars — Nintendo DS | [4066](https://howlongtobeat.com/game?id=4066) | 9 | 14 | 28 |
| Grand Theft Auto III – The Definitive Edition — PlayStation 5 | No confirmed edition match | — | — | — |
| Grand Theft Auto III — PlayStation 2 | [4061](https://howlongtobeat.com/game?id=4061) | 14 | 20 | 36 |
| Grand Theft Auto IV: The Ballad of Gay Tony — PlayStation 3 | [4074](https://howlongtobeat.com/game?id=4074) | 8 | 11 | 23 |
| Grand Theft Auto IV: The Lost and Damned — PlayStation 3 | [4063](https://howlongtobeat.com/game?id=4063) | 6 | 10 | 17 |
| Grand Theft Auto IV — PlayStation 3 | [4062](https://howlongtobeat.com/game?id=4062) | 27 | 40 | 72 |
| Grand Theft Auto: Liberty City Stories — PlayStation Portable | [4069](https://howlongtobeat.com/game?id=4069) | 14 | 21 | 39 |
| Grand Theft Auto: London 1961 — PC | [4071](https://howlongtobeat.com/game?id=4071) | 2 | 3 | 3 |
| Grand Theft Auto: London 1969 — PC | [13060](https://howlongtobeat.com/game?id=13060) | 5 | 5 | 5 |
| Grand Theft Auto Online — PlayStation 5 | [13834](https://howlongtobeat.com/game?id=13834) | 49 | 145 | 996 |
| Grand Theft Auto: San Andreas – The Definitive Edition — PlayStation 5 | No confirmed edition match | — | — | — |
| Grand Theft Auto: San Andreas — PlayStation 2 | [4073](https://howlongtobeat.com/game?id=4073) | 30 | 44 | 69 |
| Grand Theft Auto V — PlayStation 5 | [4064](https://howlongtobeat.com/game?id=4064) | 32 | 51 | 90 |
| Grand Theft Auto: Vice City Stories — PlayStation Portable | [4076](https://howlongtobeat.com/game?id=4076) | 16 | 24 | 40 |
| Grand Theft Auto: Vice City – The Definitive Edition — PlayStation 5 | No confirmed edition match | — | — | — |
| Grand Theft Auto: Vice City — PlayStation 2 | [4075](https://howlongtobeat.com/game?id=4075) | 17 | 24 | 37 |
| Grand Theft Auto — PC | [4058](https://howlongtobeat.com/game?id=4058) | 13 | 14 | 18 |
| Hollow Knight: Silksong — PlayStation 5 | [65945](https://howlongtobeat.com/game?id=65945) | 28 | 47 | 66 |
| Hollow Knight: Voidheart Edition — PlayStation 5 | [26286](https://howlongtobeat.com/game?id=26286) | 27 | 42 | 66 |
| Mafia: Definitive Edition — PlayStation 5 | [78135](https://howlongtobeat.com/game?id=78135) | 11 | 13 | 25 |
| Metal Gear Rising: Revengeance — PlayStation 3 | [5905](https://howlongtobeat.com/game?id=5905) | 7 | 12 | 41 |
| Metal Gear Solid 2: Sons of Liberty — PlayStation 2 | [5910](https://howlongtobeat.com/game?id=5910) | 13 | 15 | 29 |
| Metal Gear Solid 3: Snake Eater — PlayStation 2 | [5913](https://howlongtobeat.com/game?id=5913) | 16 | 19 | 25 |
| Metal Gear Solid 4: Guns of the Patriots — PlayStation 3 | [5916](https://howlongtobeat.com/game?id=5916) | 18 | 21 | 38 |
| Metal Gear Solid Δ: Snake Eater — PlayStation 5 | [129234](https://howlongtobeat.com/game?id=129234) | 12 | 16 | 26 |
| Metal Gear Solid: Peace Walker — PlayStation Portable | [5919](https://howlongtobeat.com/game?id=5919) | 18 | 28 | 92 |
| Metal Gear Solid: Portable Ops — PlayStation Portable | [5920](https://howlongtobeat.com/game?id=5920) | 11 | 16 | 28 |
| Metal Gear Solid: The Twin Snakes — GameCube | [5922](https://howlongtobeat.com/game?id=5922) | 10 | 12 | 19 |
| Metal Gear Solid V: Ground Zeroes — PlayStation 4 | [17291](https://howlongtobeat.com/game?id=17291) | 2 | 7 | 21 |
| Metal Gear Solid V: The Phantom Pain — PlayStation 4 | [5918](https://howlongtobeat.com/game?id=5918) | 46 | 81 | 163 |
| Metal Gear Solid — PlayStation | [5908](https://howlongtobeat.com/game?id=5908) | 11 | 13 | 18 |
| Red Dead Redemption 2 — PlayStation 4 | [27100](https://howlongtobeat.com/game?id=27100) | 51 | 85 | 196 |
| Red Dead Redemption — PlayStation 5 | [7676](https://howlongtobeat.com/game?id=7676) | 18 | 26 | 46 |
| The Legend of Zelda: Breath of the Wild — Nintendo Switch | [38019](https://howlongtobeat.com/game?id=38019) | 50 | 98 | 194 |
| The Legend of Zelda: Echoes of Wisdom — Nintendo Switch | [152370](https://howlongtobeat.com/game?id=152370) | 21 | 27 | 34 |
| The Legend of Zelda: Link's Awakening — Nintendo Switch | [66255](https://howlongtobeat.com/game?id=66255) | 14 | 16 | 21 |
| The Legend of Zelda: Ocarina of Time Remake — Nintendo Switch 2 | [187305](https://howlongtobeat.com/game?id=187305) | 17 | 21 | 26 |
| The Legend of Zelda: Ocarina of Time — Nintendo 64 | [10035](https://howlongtobeat.com/game?id=10035) | 27 | 30 | 37 |
| The Legend of Zelda: Skyward Sword HD — Nintendo Switch | [88748](https://howlongtobeat.com/game?id=88748) | 31 | 39 | 42 |
| The Legend of Zelda: Tears of the Kingdom — Nintendo Switch | [72589](https://howlongtobeat.com/game?id=72589) | 59 | 118 | 248 |
| The Legend of Zelda: Tri Force Heroes — Nintendo 3DS | [30592](https://howlongtobeat.com/game?id=30592) | 14 | 26 | 62 |
| The Legend of Zelda: Twilight Princess HD — Wii U | [33835](https://howlongtobeat.com/game?id=33835) | 30 | 39 | 44 |
| The Witcher 3: Wild Hunt - Remastered — PlayStation 5 | [40171](https://howlongtobeat.com/game?id=40171) | 57 | 124 | 189 |

Current verified-cache coverage: 46/49 catalog entries. Preserve explicit exceptions rather than borrowing another edition.

### Explicit edition exceptions and ongoing content

The three native PS5 Definitive Edition entries have no confirmed exact-edition HLTB match. Qualified queries and the normal importer returned the original GTA III (#4061, 2001), Vice City (#4075, 2002) and San Andreas (#4073, 2004). These original estimates and the combined Trilogy entry were rejected. An aggregated PS5 platform label on an original title alone does not establish a remaster match. Their absent fields remain retryable; never substitute zero or copy another edition's cache.

GTA Online #13834 lists PS5 and supplies 49/145/996h historical community estimates. These provider categories do not imply a finite Online ending, the duration of this catalog's selected milestone guide, or the player's remaining time. The separate Online guide is curated ongoing content; its shared PS5 trophy list remains in GTA V.

## Current display and remaining-time requirement

The current UI displays Main Story, Main + Extra and Completionist total hours
and a Completionist badge in the catalog. It does not record playtime or compute
remaining hours. Those three totals represent different goals, not three values
to add together; Completionist hours are not a guaranteed trophy-platinum time.

The owner's desired remaining-time feature is captured in the Notion backlog:
https://app.notion.com/p/414b7a68612181baa623d3f3ec81e796

Define whether it uses player-reported hours, story milestones or another signal,
and label uncertainty clearly. Checklist tasks have unequal duration; aggregate
collectible goals make a simple completed-checkbox percentage especially rough.

## Validation

Seven targeted tests cover retryable null/invalid cache, failure preservation,
exact edition/title matching, platform collisions, Delta normalization, invalid
times and the deadline. Syntax checks and live provider queries also passed.
Backfill uses official dry-run/apply imports without pruning; independently
compare the resulting game cache and ensure all task/category/trophy rows survive.

Client references: [maintainer README](https://github.com/jasielrt95/hltb-client/blob/main/README.md)
and [source](https://github.com/jasielrt95/hltb-client/blob/main/src/client.ts).

Initial nine-game backfill read-back passed: 8/9 games had verified caches (six newly populated,
two existing); the remake exception was null at that initial checkpoint. All 1,027 task rows, 147
category rows and 315 trophy rows were compared in full and unchanged. Game
fields outside HLTB were preserved. The read used pagination above 1,000 rows.

Measured preview/apply durations on the Surface (seconds):

| Game | Preview | Apply |
| --- | --- | --- |
| metal-gear-solid-2-sons-of-liberty | 5.4 | 27.5 |
| metal-gear-solid-3-snake-eater | 4.9 | 27.3 |
| metal-gear-solid-4-guns-of-the-patriots | 5.4 | 34.1 |
| metal-gear-solid-delta-snake-eater | 4.9 | 38.9 |
| the-legend-of-zelda-breath-of-the-wild | 3.9 | 23.3 |
| the-legend-of-zelda-tears-of-the-kingdom | 4.3 | 30.7 |
