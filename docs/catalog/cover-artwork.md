# Curated cover artwork

Prefer official square artwork or a store icon at a usable resolution. Verify the exact game and edition before saving a local PNG. A URL ending in .png can still return JPEG bytes; decode and encode a real PNG without altering the artwork's pixels or dimensions.

For Nintendo games, the publisher's public European catalog exposes image_url_sq_s. Query the exact title or verified NSUID at https://searching.nintendo-europe.com/en/select with type:GAME, then inspect the returned title, platform and product URL before using its square image. Product-page HTML often shows only a landscape hero or portrait packshot even when the catalog has an official square. This is a read-only curation source, not an application runtime integration.

Example: Echoes of Wisdom on Switch, verified European NSUID 70010000084619, has official 500px square art at https://www.nintendo.com/eu/media/images/11_square_images/games_18/nintendo_switch_5/1x1_NSwitch_TheLegendofZeldaEchoesOfWisdom_image500w.jpg .

For PlayStation listings, inspect Product JSON-LD and the MASTER image for the exact edition. Verify actual dimensions; do not substitute a screenshot, banner or another edition merely because the URL looks suitable.

When no suitable square is located, preserve the best matching cover in its original proportions. The entire artwork must fit the app's standard frame using object-contain. Do not crop, stretch or manufacture a square by cutting off cover information. A 32px icon is not a useful substitute for a readable full cover.

All newly added local covers require publication with the next authorized release. A catalog row referencing a local file does not make that file available on the deployed site. Verify the published asset URL after release.

When a registration is authorized without a new application release, a cover may
be served from the existing public Supabase Storage bucket instead. Retain the
inspected PNG at `public/covers/<slug>.png` for version control, upload a new
immutable object under the curator's UUID namespace at
`<uid>/catalog-covers/<slug>/<sha256>.png`, and use its public URL as `cover_url`.
Never create a bucket or overwrite an existing object for this purpose. Confirm
public HTTP200/image, exact SHA-256 bytes and the live Next image optimizer before
importing the game. Supabase public Storage URLs are already allowed by the app's
image configuration. This publishes only authorized catalog artwork; it does not
require a code deploy, Git push or a missing `/covers/` asset on the live site.
