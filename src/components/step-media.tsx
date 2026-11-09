"use client";

import Image from "next/image";
import { useState } from "react";
import { Expand, Play } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";

type Media =
  | { kind: "youtube"; id: string; start: number; thumb: string }
  | { kind: "image"; src: string };

// "95", "95s", "1m35s", "1h2m3s" → seconds.
function parseStart(value: string | null): number {
  if (!value) return 0;
  if (/^\d+s?$/.test(value)) return parseInt(value, 10);
  const m = value.match(/^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?$/);
  if (!m) return 0;
  return (+(m[1] ?? 0)) * 3600 + (+(m[2] ?? 0)) * 60 + +(m[3] ?? 0);
}

/**
 * A step's `image_url` is either an image or a YouTube link. YouTube links
 * show the video's own thumbnail and play in the official (no-cookie) embed —
 * the sanctioned way to show real footage of the game without copying anyone's
 * screenshots.
 */
export function parseStepMedia(url: string): Media {
  try {
    const u = new URL(url, "https://xplore.invalid");
    const host = u.hostname.replace(/^www\.|^m\./, "");
    let id: string | null = null;
    if (host === "youtube.com") id = u.searchParams.get("v");
    if (host === "youtu.be") id = u.pathname.slice(1) || null;
    if (id && /^[\w-]{11}$/.test(id)) {
      return {
        kind: "youtube",
        id,
        start: parseStart(u.searchParams.get("t") ?? u.searchParams.get("start")),
        thumb: `https://i.ytimg.com/vi/${id}/mqdefault.jpg`,
      };
    }
  } catch {
    // Not a URL we understand — treat it as an image path.
  }
  return { kind: "image", src: url };
}

/** Small thumbnail beside a step; opens the image or video in a dialog. */
export function StepMediaThumb({
  url,
  title,
  labels,
}: {
  url: string;
  title: string;
  labels: { viewImage: string; watchVideo: string };
}) {
  const [open, setOpen] = useState(false);
  const media = parseStepMedia(url);
  const isVideo = media.kind === "youtube";
  const thumb = isVideo ? media.thumb : media.src;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`${isVideo ? labels.watchVideo : labels.viewImage}: ${title}`}
        className="group relative mt-0.5 block aspect-video w-20 shrink-0 overflow-hidden rounded-lg border bg-muted outline-none transition-transform focus-visible:ring-3 focus-visible:ring-ring/50 active:scale-95 sm:w-28"
      >
        <Image
          src={thumb}
          alt=""
          fill
          sizes="112px"
          unoptimized={isVideo}
          className="object-cover transition-transform duration-300 group-hover:scale-105"
        />
        <span className="absolute inset-0 flex items-center justify-center bg-black/25 transition-colors group-hover:bg-black/40">
          {isVideo ? (
            <span className="flex size-7 items-center justify-center rounded-full bg-black/60 ring-1 ring-white/30">
              <Play className="size-3.5 translate-x-px fill-white text-white" aria-hidden />
            </span>
          ) : (
            <Expand className="size-4 text-white opacity-0 transition-opacity group-hover:opacity-100" aria-hidden />
          )}
        </span>
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="gap-2 bg-card p-2 sm:max-w-3xl sm:p-3">
          <DialogTitle className="pr-10 pl-1 text-sm font-medium">{title}</DialogTitle>
          <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-black">
            {open &&
              (isVideo ? (
                <iframe
                  src={`https://www.youtube-nocookie.com/embed/${media.id}?autoplay=1&rel=0&start=${media.start}`}
                  title={title}
                  allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
                  allowFullScreen
                  className="absolute inset-0 size-full"
                />
              ) : (
                <Image src={media.src} alt={title} fill sizes="(max-width: 768px) 100vw, 768px" className="object-contain" />
              ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
