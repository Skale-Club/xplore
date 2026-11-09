import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";

// This file must sit next to `app/` — i.e. in `src/`, since the app lives in
// `src/app`. Next.js silently ignores a proxy file at the repo root when a
// `src/` directory is used, which leaves every route ungated.
export async function proxy(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    // Everything except Next internals, the PWA files (service worker,
    // manifest and the offline page it pre-caches) and static images.
    "/((?!_next/static|_next/image|favicon.ico|sw.js|manifest.webmanifest|offline.html|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
