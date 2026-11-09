import Image from "next/image";
import { cn } from "@/lib/utils";

// Platform logos, used only to identify which console a game is on.
// Sources (all free to reuse as files):
// - PlayStation: Simple Icons (CC0-1.0), https://simpleicons.org — single-colour
//   path, rendered inline so it follows the text colour in light and dark.
// - Nintendo Switch 2: Wikimedia Commons "Nintendo Switch 2 logo.svg" (public domain).
// - Nintendo GameCube: Wikimedia Commons "Nintendo GameCube symbol logo.svg" (CC0).
// Simple Icons no longer carries Nintendo or Xbox marks, so unknown platforms
// simply render their name without a logo.
type Logo =
  | { kind: "image"; src: string }
  | { kind: "path"; viewBox: string; d: string };

const PLAYSTATION_PATH =
  "M8.984 2.596v17.547l3.915 1.261V6.688c0-.69.304-1.151.794-.991.636.18.76.814.76 1.505v5.875c2.441 1.193 4.362-.002 4.362-3.152 0-3.237-1.126-4.675-4.438-5.827-1.307-.448-3.728-1.186-5.39-1.502zm4.656 16.241l6.296-2.275c.715-.258.826-.625.246-.818-.586-.192-1.637-.139-2.357.123l-4.205 1.5V14.98l.24-.085s1.201-.42 2.913-.615c1.696-.18 3.785.03 5.437.661 1.848.601 2.04 1.472 1.576 2.072-.465.6-1.622 1.036-1.622 1.036l-8.544 3.107V18.86zM1.807 18.6c-1.9-.545-2.214-1.668-1.352-2.32.801-.586 2.16-1.052 2.16-1.052l5.615-2.013v2.313L4.205 17c-.705.271-.825.632-.239.826.586.195 1.637.15 2.343-.12L8.247 17v2.074c-.12.03-.256.044-.39.073-1.939.331-3.996.196-6.038-.479z";

const LOGOS: [RegExp, Logo][] = [
  [/switch\s*2/i, { kind: "image", src: "/platforms/nintendo-switch-2.svg" }],
  [/game\s*cube/i, { kind: "image", src: "/platforms/nintendo-gamecube.svg" }],
  [/playstation|^ps\s*\d?$/i, { kind: "path", viewBox: "0 0 24 24", d: PLAYSTATION_PATH }],
];

function logoFor(platform: string): Logo | null {
  return LOGOS.find(([pattern]) => pattern.test(platform))?.[1] ?? null;
}

/** The platform's logo at icon size, or nothing when we don't have one. */
export function PlatformLogo({ platform, className }: { platform: string; className?: string }) {
  const logo = logoFor(platform);
  if (!logo) return null;
  if (logo.kind === "path") {
    return (
      <svg viewBox={logo.viewBox} aria-hidden className={cn("size-3.5 shrink-0 fill-current", className)}>
        <path d={logo.d} />
      </svg>
    );
  }
  return (
    <Image
      src={logo.src}
      alt=""
      width={16}
      height={16}
      unoptimized
      className={cn("size-3.5 shrink-0 rounded-[3px] object-contain", className)}
    />
  );
}
