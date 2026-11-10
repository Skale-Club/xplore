# Selective walkthrough guidance review

Date: 2026-11-09. Scope: the six catalog games preceding the two MGS3 entries.

Add extended guidance when a short task hides a prerequisite, multi-stage puzzle,
boss vulnerability, recovery path or edition-specific control. Explain the setup,
actions and likely failure/recovery. Keep simple travel and story-viewing tasks
short. Guidance remains optional and bilingual, behind the task's Details button.

| Game | Steps reviewed | New explanations | Total explanations | Examples |
| --- | --- | --- | --- | --- |
| Metal Gear Solid | 101 | 8 | 8 | Nikita, Ninja, Mantis, PSG-1, torture, cell escape, PAL, REX |
| The Twin Snakes | 101 | 8 | 8 | Same difficult encounters, adapted to GameCube |
| MGS2: Sons of Liberty | 107 | 8 | 10 | Tanker trap/photos, Sensor B, Ames, power panel, Emma, RAY |
| Ocarina of Time Remake | 164 | 6 | 6 | Gohma, Barinade, Poe Sisters, water levels, Bongo Bongo, Twinrova |
| Breath of the Wild | 96 | 6 | 7 | Blue flame, Ruta wheels, three Blights, Lost Woods |
| Tears of the Kingdom | 116 | 6 | 8 | Nachoyah, watery bridge, three bosses, Hateno prerequisites |
| Total | 685 | 42 | 47 | Five earlier explanations retained |

The two MGS3 entries retain their eight earlier explanations. Across all eight
games the catalog therefore has 55 detailed tasks. This is selective guidance,
not an exhaustive puzzle or collectible-location guide.

## Corrections discovered during review

- The Twin Snakes uses controller port 4 for Psycho Mantis; original PlayStation
  MGS uses port 2. The GameCube title and description were corrected. Its stable
  key remains `move-the-controller-to-port-2` because keys preserve saved progress.
- In both games the PAL sequence is normal, cold, then hot. Short descriptions
  were corrected and the existing cold/hot tasks put in the matching order.
  Their stable keys and IDs are unchanged. The original uses Raven's warehouse
  and the Blast Furnace; the remake also has local pipe shortcuts.
- Ocarina is the Nintendo Switch 2 remake already present in the catalog.
  Remake-specific guides were used, including its revised Poe encounter; the
  old N64 dungeon layouts were not assumed to be identical.

## Sources

- [PS1 campaign reference](https://gamefaqs.gamespot.com/ps/197909-metal-gear-solid/faqs/4010),
  [PAL temperatures](https://mgcvt.com/guide/mgs1/chart8.htm),
  [cell escape](https://strategywiki.org/wiki/Metal_Gear_Solid/Hunting_the_Wolf).
- [GameCube campaign reference](https://gamefaqs.gamespot.com/gamecube/589712-metal-gear-solid-the-twin-snakes/faqs/29305),
  [GameCube controller/pipe differences](https://www.neoseeker.com/mgs-twinsnakes/cheats/gc/),
  [GameCube prison reference](https://www.gamespot.com/articles/metal-gear-solid-the-twin-snakes-walkthrough/1100-6090942/).
- [Konami photography instructions](https://metalgear.konami.net/manual/mc1/mgs2/ps5/en/page20.html),
  [Konami Ames prerequisites](https://www.konami.com/mg/archive/ssg/advice_2/advice_mgs2_07.html),
  [PS2 campaign reference](https://gamefaqs.gamespot.com/ps2/913941-metal-gear-solid-2-sons-of-liberty/faqs/20535),
  [PS2 rescue/power-panel reference](https://gamefaqs.gamespot.com/ps2/913941-metal-gear-solid-2-sons-of-liberty/faqs/24167).
- [Nintendo confirms the Ocarina remake](https://www.nintendo.com/us/whatsnew/its-time-experience-the-legend-of-zelda-ocarina-of-time-reborn-exclusively-for-nintendo-switch-2/),
  [remake Forest Temple](https://zeldacentral.com/games/ocarina-of-time-remake/walkthrough/forest-temple/),
  [remake Water Temple](https://zeldacentral.com/games/ocarina-of-time-remake/walkthrough/water-temple/),
  [remake Shadow Temple](https://zeldacentral.com/games/ocarina-of-time-remake/walkthrough/shadow-temple/),
  [remake Barinade](https://www.gamerguruguides.com/guides/ocarina-of-time-remake-walkthrough-part-10),
  [remake Spirit Temple](https://zeldacentral.com/games/ocarina-of-time-remake/walkthrough/spirit-temple/).
- [BOTW Hateno](https://www.zeldadungeon.net/breath-of-the-wild-walkthrough/hateno-village/),
  [Ruta](https://www.zeldadungeon.net/breath-of-the-wild-walkthrough/vah-ruta-dungeon/),
  [Rudania](https://www.zeldadungeon.net/breath-of-the-wild-walkthrough/vah-rudania-dungeon/),
  [Naboris](https://www.zeldadungeon.net/breath-of-the-wild-walkthrough/vah-naboris-dungeon/),
  [Lost Woods](https://www.zeldadungeon.net/breath-of-the-wild-walkthrough/the-master-sword/).
- [TOTK Nachoyah](https://www.zeldawiki.wiki/wiki/Nachoyah_Shrine),
  [watery bridge](https://zeldawiki.wiki/wiki/Clues_to_the_Sky),
  [Marbled Gohma](https://www.gamerguides.com/the-legend-of-zelda-tears-of-the-kingdom/guide/main-quests/eldin/how-to-defeat-marbled-gohma),
  [Queen Gibdo](https://zeldadungeon.net/wiki/Queen_Gibdo),
  [Seized Construct](https://zeldawiki.wiki/wiki/Seized_Construct),
  [Hateno laboratory](https://www.zeldadungeon.net/wiki/Hateno_Village_Research_Lab).

## Validation

The official importer ran with preview before apply, `--skip-hltb` and no pruning
against the existing development project. Verification compares the stored
guidance and translations with each content file and checks all prior game,
category, item and trophy IDs, existing guidance and step images. No tasks were
added or removed. This content-only work does not require a full application
build; the existing pending real-browser layout review remains separate.

No push, deployment or production change is included in this review.

Measured preview + apply durations on the Surface (seconds):

| Game | Preview | Apply |
| --- | --- | --- |
| metal-gear-solid-the-twin-snakes | 3.5 | 43.9 |
| metal-gear-solid | 3.5 | 41.6 |
| metal-gear-solid-2-sons-of-liberty | 3.7 | 25.1 |
| the-legend-of-zelda-ocarina-of-time-remake | 8.9 | 38.3 |
| the-legend-of-zelda-breath-of-the-wild | 3.4 | 23.1 |
| the-legend-of-zelda-tears-of-the-kingdom | 3.8 | 28.2 |
