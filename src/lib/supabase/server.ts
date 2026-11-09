import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";
import { getSession } from "@/lib/auth/session";
import { createDatabaseToken } from "@/lib/auth/tokens";

export async function createClient() {
  const user = await getSession();
  return createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
      global: { fetch: (input, init) => fetch(input, { ...init, cache: "no-store" }) },
      // Use the authenticated role, never the service role, for application data.
      accessToken: user
        ? () => createDatabaseToken(user.sub, process.env.SUPABASE_JWT_SECRET ?? "")
        : undefined,
    },
  );
}
