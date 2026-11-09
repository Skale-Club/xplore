import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";
import { SESSION_COOKIE, SESSION_COOKIE_OPTIONS, SESSION_MAX_AGE, newSessionToken, sessionTokenHash } from "./tokens";

export async function readSession(token: string | undefined) {
  const hash = token ? sessionTokenHash(token) : null;
  if (!hash) return null;
  const admin = createAdminClient();
  const { data: session, error } = await admin.from("app_sessions")
    .select("user_id").eq("token_hash", hash)
    .gt("expires_at", new Date().toISOString()).maybeSingle();
  if (error) throw new Error("Session lookup failed");
  if (!session) return null;
  const { data: user, error: userError } = await admin.from("app_users")
    .select("id, email").eq("id", session.user_id).maybeSingle();
  if (userError) throw new Error("Account lookup failed");
  return user ? { sub: user.id, email: user.email ?? undefined } : null;
}
export const getSession = cache(async () => readSession((await cookies()).get(SESSION_COOKIE)?.value));

export async function createSession(userId: string) {
  const token = newSessionToken();
  const store = await cookies();
  const oldHash = sessionTokenHash(store.get(SESSION_COOKIE)?.value ?? "");
  const admin = createAdminClient();
  const { error } = await admin.from("app_sessions").insert({
    token_hash: sessionTokenHash(token)!, user_id: userId,
    expires_at: new Date(Date.now() + SESSION_MAX_AGE * 1000).toISOString(),
  });
  if (error) throw new Error("Session creation failed");
  if (oldHash) {
    const { error: revokeError } = await admin.from("app_sessions").delete().eq("token_hash", oldHash);
    if (revokeError) throw new Error("Session rotation failed");
  }
  store.set(SESSION_COOKIE, token, { ...SESSION_COOKIE_OPTIONS, maxAge: SESSION_MAX_AGE });
}
export async function destroySession() {
  const store = await cookies();
  const hash = sessionTokenHash(store.get(SESSION_COOKIE)?.value ?? "");
  if (hash) {
    const { error } = await createAdminClient().from("app_sessions").delete().eq("token_hash", hash);
    if (error) throw new Error("Session revocation failed");
  }
  store.set(SESSION_COOKIE, "", { ...SESSION_COOKIE_OPTIONS, maxAge: 0 });
}
