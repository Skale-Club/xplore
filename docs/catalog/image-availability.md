# Published image availability investigation

Checked on 2026-11-09 against https://xplore-neon.vercel.app.

## Cover files

At the initial nine-game investigation, all cover URLs mapped to valid local PNG files. The published site
serves only the three covers already present in main at commit 5fca706.

| Cover | Published response |
| --- | --- |
| Metal Gear Solid | 200, image/png |
| The Twin Snakes | 200, image/png |
| Ocarina of Time Remake | 200, image/png |
| Breath of the Wild | 404, text/html |
| Tears of the Kingdom | 404, text/html |
| MGS2: Sons of Liberty | 404, text/html |
| MGS3: Snake Eater | 404, text/html |
| MGS Delta | 404, text/html |
| MGS4: Guns of the Patriots | 404, text/html |

The six missing covers are new, untracked files in public/covers, absent from the
published commit. Catalog records were imported into the configured development
database before those static files were released. A client receiving those
records requests paths the published deployment does not contain. The observed
404s do not redirect to login; this is not an image aspect-ratio issue.

Example checked path:
https://xplore-neon.vercel.app/covers/the-legend-of-zelda-breath-of-the-wild.png

Publication must deliver the referenced static files alongside catalog changes.
Verify each cover URL returns an image after deployment. Production publication
still requires the owner's release authorization; no release happened during
this investigation.

The subsequent sequential catalog expansion adds more local covers under the same publication rule. Each new file is validated and visually inspected during its game registration. These development imports do not publish static files; the original nine-game HTTP matrix above is evidence from that initial check, not a claim that later cover URLs were individually checked on the live site. See the sequential queue for the full pending asset batch.

## Separate task-editor defect

Ocarina's content contains 26 YouTube links in image_url. The walkthrough's
step-media.tsx understands video URLs and renders a YouTube thumbnail/player.
The edit form's item-image.tsx instead passes each raw URL directly to next/image.
A YouTube watch page is HTML, not an image, and youtube.com is not in the image
host configuration. Those editor previews need to reuse video-aware media
handling. No video availability or live authenticated editor session was tested.

This was a read-only diagnosis. No image-host permissions, rendering code,
storage objects or deployed assets were changed to work around the missing files.
