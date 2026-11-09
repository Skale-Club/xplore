import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/types/supabase";

// Browser client. The auth cookies are HttpOnly (cookie-options.ts), so this
// client never sees the session and every call it makes runs as anon. Use it
// only for things that need no identity, such as uploadToSignedUrl with a
// token minted server-side.
export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
  );
}
