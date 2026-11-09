import { createRemoteJWKSet, jwtVerify, type JWTVerifyGetKey } from "jose";

const googleKeys = createRemoteJWKSet(new URL(
  "https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com"
));

export type GoogleIdentity = { subject: string; email: string; name: string; canLinkLegacy: boolean };

export async function verifyGoogleIdentity(
  token: string, projectId: string, keys: JWTVerifyGetKey = googleKeys,
): Promise<GoogleIdentity> {
  if (!projectId) throw new Error("Google Identity is not configured");
  const { payload } = await jwtVerify(token, keys, {
    algorithms: ["RS256"], audience: projectId,
    issuer: `https://securetoken.google.com/${projectId}`,
    requiredClaims: ["sub", "iat", "exp", "auth_time"],
    // Match Xpot's tolerance for a server clock slightly behind Google's.
    maxTokenAge: "65m", clockTolerance: "5m",
  });
  const firebase = payload.firebase as { sign_in_provider?: string; tenant?: string } | undefined;
  const now = Math.floor(Date.now() / 1000);
  if (
    !payload.sub || payload.sub.length > 128 || firebase?.tenant ||
    firebase?.sign_in_provider !== "google.com" ||
    payload.email_verified !== true || typeof payload.email !== "string" || payload.email.length > 320 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.email) ||
    typeof payload.auth_time !== "number" || payload.auth_time > now + 300 ||
    payload.auth_time < now - 600
  ) throw new Error("A recent verified Google sign-in is required");
  const email = payload.email.toLowerCase();
  return {
    subject: payload.sub, email,
    name: typeof payload.name === "string" ? payload.name.slice(0, 200) : "",
    // Generic verified third-party addresses do not prove current ownership of
    // a legacy account. Only Google-authoritative Gmail emails auto-link.
    canLinkLegacy: email.endsWith("@gmail.com"),
  };
}
