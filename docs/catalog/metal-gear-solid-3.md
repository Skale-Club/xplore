# Metal Gear Solid 3 catalog scope

Updated: 2026-11-09.

The owner requested two entries: the PS2 game and the current Delta remake.
Subsistence is an expanded PS2 edition of the same campaign, documented within
the PS2 walkthrough rather than duplicated as another catalog entry.

| Slug | Platform | Categories | Story / optional / collectible steps | Extended details | Trophies |
| --- | --- | --- | --- | --- | --- |
| metal-gear-solid-3-snake-eater | PlayStation 2 | 18 | 105 / 7 / 4 | 4 | None native to PS2 |
| metal-gear-solid-delta-snake-eater | PlayStation 5 | 18 | 105 / 7 / 6 | 4 | 36 bronze, 5 silver, 4 gold, 1 platinum |

Both routes cover the Virtuous Mission and Operation Snake Eater through the
ending. Optional goals are gameplay challenges, not an invented side-quest
system. Collectible checkboxes are aggregate milestones, not exhaustive location
guides. Delta includes its additional GA-KO figures; PS2 does not. The PS2 entry
explains fixed versus Subsistence free camera and pressure-sensitive controls.
Delta explains New Style and Legacy Style. Trophy names retain their English
identifiers in both locales, with independently written EN/PT requirements.
No provider account connection or automatic achievement synchronization exists.

## Artwork

- Delta uses the official square 1024 × 1024 PlayStation Store icon:
  https://image.api.playstation.com/vulcan/ap/rnd/202406/0513/d35b305652ee922a72b4020bd5d6ef36675cf526dd4945d1.png
- PS2 uses the original 512 × 736 North American cover scan:
  https://raw.githubusercontent.com/xlenore/ps2-covers/main/covers/default/SLUS-20915.jpg

Source JPEGs were encoded as PNG without resizing, cropping or changing artwork.
The app preserves the full foreground artwork with contain fitting. A square
original-PS2 asset was not found; do not substitute Master Collection artwork.

## Research

- [Konami: original PS2 product](https://www.konami.com/games/eu/en/products/mgs3se/).
- [Konami: Subsistence](https://www.konami.com/games/jp/ja/products/mgssub/).
- [Konami: Delta](https://www.konami.com/games/eu/en/products/mgs3r/).
- [PlayStation Blog: Delta controls](https://blog.playstation.com/2025/08/22/metal-gear-solid-delta-snake-eater-hands-on-report-2/).
- [PS5 trophy list and tiers](https://platpursuit.com/games/NPWR36763_00/),
  [French cross-check](https://www.psthc.fr/unjeu/metal-gear-solid-snake-eater-ps5/liste-trophees.htm),
  [public trophy list](https://www.playstationtrophies.org/game/metal-gear-solid-delta-snake-eater/trophies/),
  [trophy requirement cross-check](https://www.pushsquare.com/guides/metal-gear-solid-delta-trophy-guide-all-trophies-and-how-to-get-the-platinum).
- [PS2 campaign reference](https://gamefaqs.gamespot.com/ps2/914828-metal-gear-solid-3-snake-eater/faqs/33576).
- [Prison escape reference](https://www.pcgamer.com/games/action/metal-gear-solid-delta-snake-eater-escape-prison-cell/).
- [Difficulty-dependent bridge charges](https://mgcvt.com/guide/mgs3/chart10.htm).

## Validation and publication

Both files passed bilingual, frozen-key uniqueness, category-kind, details,
trophy-tier and PNG dimension checks. Official imports ran first in dry-run mode,
then applied to the existing Supabase development project with `--skip-hltb`
and without pruning. Independent database read-back matched all 234 steps,
eight extended explanations and 46 trophies. Six pre-existing game IDs survived;
there is no separate Subsistence row. Subsequent dry-runs reported zero inserts
and zero orphan rows.

Measured lightweight checks on the Surface: repeat dry-run 4.65 s (PS2), 4.60 s
(Delta); independent read-back 1.53 s (PS2), 1.96 s (Delta). No full build or browser
automation was needed for these data-only additions. Covers remain local files
until publication; this task did not push or deploy code or touch production.
