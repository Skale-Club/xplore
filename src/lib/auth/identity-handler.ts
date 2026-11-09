import type { GoogleIdentity } from "./identity";

function reply(body: Record<string, unknown>, status: number) {
  return Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
}
export type IdentityHandlerDependencies = {
  origin?: string;
  projectId?: string;
  databaseSecretConfigured: boolean;
  verifyIdentity: (token: string, projectId: string) => Promise<GoogleIdentity>;
  resolveIdentity: (identity: GoogleIdentity, projectId: string) => Promise<{ userId: string | null; linkRequired: boolean }>;
  createSession: (userId: string) => Promise<void>;
};

export async function handleIdentityRequest(request: Request, deps: IdentityHandlerDependencies) {
  // Same-origin JSON only: prevent login CSRF before identity or DB work.
  const expectedOrigin = deps.origin;
  if (!expectedOrigin) return reply({ error: "AUTH_UNAVAILABLE" }, 503);
  if (request.headers.get("origin") !== expectedOrigin ||
      request.headers.get("sec-fetch-site") === "cross-site") {
    return reply({ error: "FORBIDDEN" }, 403);
  }
  if (!request.headers.get("content-type")?.startsWith("application/json")) {
    return reply({ error: "INVALID_REQUEST" }, 415);
  }
  let body: unknown;
  try {
    const reader = request.body?.getReader();
    if (!reader) return reply({ error: "INVALID_REQUEST" }, 400);
    let bytes = 0;
    let input = "";
    const decoder = new TextDecoder();
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      bytes += chunk.value.byteLength;
      if (bytes > 16_384) { await reader.cancel(); return reply({ error: "INVALID_REQUEST" }, 413); }
      input += decoder.decode(chunk.value, { stream: true });
    }
    body = JSON.parse(input + decoder.decode());
  } catch { return reply({ error: "INVALID_REQUEST" }, 400); }
  const token = (body as { idToken?: unknown } | null)?.idToken;
  if (typeof token !== "string" || token.length > 12_000) return reply({ error: "INVALID_REQUEST" }, 400);
  const projectId = deps.projectId;
  if (!projectId || !deps.databaseSecretConfigured) {
    return reply({ error: "AUTH_UNAVAILABLE" }, 503);
  }
  let identity;
  try { identity = await deps.verifyIdentity(token, projectId); }
  catch { return reply({ error: "INVALID_IDENTITY" }, 401); }
  try {
    const { userId, linkRequired } = await deps.resolveIdentity(identity, projectId);
    if (linkRequired) return reply({ error: "ACCOUNT_LINK_REQUIRED" }, 409);
    if (!userId) return reply({ error: "AUTH_UNAVAILABLE" }, 503);
    await deps.createSession(userId);
    return reply({ status: "active" }, 200);
  } catch { return reply({ error: "AUTH_UNAVAILABLE" }, 503); }
}
