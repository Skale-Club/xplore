import assert from "node:assert/strict";
import { test } from "node:test";
import { generateKeyPair, SignJWT, jwtVerify, createLocalJWKSet, exportJWK } from "jose";
import { verifyGoogleIdentity } from "../../src/lib/auth/identity.ts";
import { createDatabaseToken, newSessionToken, sessionTokenHash } from "../../src/lib/auth/tokens.ts";
import { handleIdentityRequest } from "../../src/lib/auth/identity-handler.ts";

const project = "fake-development-project";
const pair = await generateKeyPair("RS256");
const jwk = await exportJWK(pair.publicKey);
const keys = createLocalJWKSet({ keys: [{ ...jwk, kid: "test-key", alg: "RS256" }] });
const now = () => Math.floor(Date.now() / 1000);
async function token(overrides = {}, signingKey = pair.privateKey) {
  return new SignJWT({
    sub: "firebase-non-uuid", aud: project, iss: `https://securetoken.google.com/${project}`,
    iat: now(), exp: now() + 3600, auth_time: now(), email: "player@gmail.com",
    email_verified: true, firebase: { sign_in_provider: "google.com" }, ...overrides,
  }).setProtectedHeader({ alg: "RS256", kid: "test-key" }).sign(signingKey);
}

test("valid Google token resolves a verified identity without treating Firebase sub as the app UUID", async () => {
  const identity = await verifyGoogleIdentity(await token(), project, keys);
  assert.equal(identity.subject, "firebase-non-uuid");
  assert.equal(identity.email, "player@gmail.com");
  assert.equal(identity.canLinkLegacy, true);
  assert.equal((await verifyGoogleIdentity(await token({ email: "player@example.com" }), project, keys)).canLinkLegacy, false);
});

test("rejects forged, expired, cross-project, tenant, password, phone and unverified identities", async () => {
  const otherPair = await generateKeyPair("RS256");
  await assert.rejects(verifyGoogleIdentity(await token({}, otherPair.privateKey), project, keys));
  for (const claims of [
    { aud: "another-project" }, { iss: "https://attacker.example" },
    { exp: now() - 600 }, { iat: now() + 600 }, { auth_time: now() - 900 }, { auth_time: now() + 600 },
    { email_verified: false }, { email: null }, { sub: "" },
    { firebase: { sign_in_provider: "password" } },
    { firebase: { sign_in_provider: "phone" } },
    { firebase: { sign_in_provider: "google.com", tenant: "unexpected-tenant" } },
  ]) await assert.rejects(verifyGoogleIdentity(await token(claims), project, keys));
});

test("database bridge issues only short-lived authenticated tokens with the application UUID", async () => {
  const secret = "fake-secret-for-local-tests-only-32-characters";
  const userId = "11111111-1111-4111-8111-111111111111";
  const jwt = await createDatabaseToken(userId, secret);
  const { payload } = await jwtVerify(jwt, new TextEncoder().encode(secret), { audience: "authenticated", algorithms: ["HS256"] });
  assert.equal(payload.sub, userId);
  assert.equal(payload.role, "authenticated");
  assert.equal(payload.xplore_auth, "google-identity-v1");
  assert.equal(payload.exp - payload.iat, 60);
  await assert.rejects(createDatabaseToken("firebase-non-uuid", secret));
  await assert.rejects(createDatabaseToken(userId, "short"));
});

test("opaque session tokens are random, validated and stored by hash", () => {
  const first = newSessionToken();
  assert.match(first, /^[a-f0-9]{64}$/);
  assert.notEqual(first, newSessionToken());
  assert.notEqual(sessionTokenHash(first), first);
  assert.equal(sessionTokenHash(first), sessionTokenHash(first));
  assert.equal(sessionTokenHash("attacker-input"), null);
});

const origin = "https://xplore.example";
function request(body = { idToken: "valid-test-token" }, headers = {}) {
  return new Request(`${origin}/api/auth/identity`, {
    method: "POST", headers: { Origin: origin, "Content-Type": "application/json", ...headers },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}
function dependencies(overrides = {}) {
  const calls = [];
  return { calls, origin, projectId: project, databaseSecretConfigured: true,
    verifyIdentity: async () => { calls.push("verify"); return { subject: "google-sub", email: "player@gmail.com", name: "Player", canLinkLegacy: true }; },
    resolveIdentity: async () => { calls.push("resolve"); return { userId: "canonical-uuid", linkRequired: false }; },
    createSession: async id => { calls.push(`session:${id}`); }, ...overrides };
}

test("login rejects cross-origin, non-JSON, malformed, missing and oversized bodies before identity lookup", async () => {
  for (const [req, status] of [
    [request({}, { Origin: "https://attacker.example" }), 403],
    [request({}, { "Sec-Fetch-Site": "cross-site" }), 403],
    [request({}, { "Content-Type": "text/plain" }), 415],
    [request("{"), 400], [request(null), 400], [request({}), 400],
    [request({ idToken: "x".repeat(12001) }), 400], [request("x".repeat(17000)), 413],
  ]) {
    const deps = dependencies();
    assert.equal((await handleIdentityRequest(req, deps)).status, status);
    assert.deepEqual(deps.calls, []);
  }
});

test("invalid identities and unavailable configuration cannot create app users or sessions", async () => {
  const deps = dependencies({ verifyIdentity: async () => { throw new Error("bad signature"); } });
  assert.equal((await handleIdentityRequest(request(), deps)).status, 401);
  assert.deepEqual(deps.calls, []);
  for (const config of [{ origin: undefined }, { projectId: undefined }, { databaseSecretConfigured: false }]) {
    const unavailable = dependencies(config);
    assert.equal((await handleIdentityRequest(request(), unavailable)).status, 503);
    assert.deepEqual(unavailable.calls, []);
  }
});

test("only successful identity binding establishes a session; errors never expose internal details", async () => {
  const deps = dependencies();
  const result = await handleIdentityRequest(request(), deps);
  assert.equal(result.status, 200);
  assert.equal(result.headers.get("Cache-Control"), "no-store");
  assert.deepEqual(await result.json(), { status: "active" });
  assert.deepEqual(deps.calls, ["verify", "resolve", "session:canonical-uuid"]);
  const conflict = dependencies({ resolveIdentity: async () => ({ userId: null, linkRequired: true }) });
  const blocked = await handleIdentityRequest(request(), conflict);
  assert.equal(blocked.status, 409);
  assert.deepEqual(await blocked.json(), { error: "ACCOUNT_LINK_REQUIRED" });
  assert.deepEqual(conflict.calls, ["verify"]);
  const broken = dependencies({ createSession: async () => { throw new Error("database-password-must-not-leak"); } });
  const failure = await handleIdentityRequest(request(), broken);
  assert.equal(failure.status, 503);
  assert.equal((await failure.text()).includes("database-password"), false);
});
