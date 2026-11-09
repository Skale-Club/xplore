import { createHash, randomBytes } from "node:crypto";
import { SignJWT } from "jose";

export const SESSION_COOKIE = "xplore_session";
export const SESSION_MAX_AGE = 60 * 60 * 24 * 30;
export const SESSION_COOKIE_OPTIONS = {
  httpOnly: true, secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const, path: "/",
};
export function newSessionToken() { return randomBytes(32).toString("hex"); }
export function sessionTokenHash(token: string) {
  return /^[a-f0-9]{64}$/.test(token)
    ? createHash("sha256").update(token).digest("hex") : null;
}

// Server-only 60-second token: PostgREST and Storage still enforce existing RLS
// with the canonical application UUID. This is never a browser session token.
export async function createDatabaseToken(userId: string, secret: string) {
  if (secret.length < 32) throw new Error("SUPABASE_JWT_SECRET is not configured");
  if (!/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(userId)) {
    throw new Error("Invalid application user ID");
  }
  return new SignJWT({ role: "authenticated", xplore_auth: "google-identity-v1" })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setSubject(userId).setAudience("authenticated").setIssuedAt().setExpirationTime("60s")
    .sign(new TextEncoder().encode(secret));
}
