// Unofficial provider; lazy loading keeps pure matching/cache tests offline.
export const HLTB_TIMEOUT_MS = 10_000;

export async function hltbClient() {
  const { HLTBClient } = await import("hltb-client");
  return new HLTBClient({ timeout: HLTB_TIMEOUT_MS });
}

export function normalizeHltbTitle(title) {
  return String(title ?? "").replace(/[Δδ]/gu, " delta ")
    .normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase()
    .replace(/[^\p{Letter}\p{Number}]+/gu, " ").trim().replace(/\s+/gu, " ");
}

function normalizePlatform(platform) {
  const value = normalizeHltbTitle(platform).replace(/ /g, "");
  return ({ gamecube: "nintendogamecube", ps2: "playstation2", ps3: "playstation3", ps5: "playstation5", switch: "nintendoswitch" })[value] ?? value;
}

const positiveTime = (value) => typeof value === "number" && Number.isFinite(value) && value > 0 ? value : null;
const validId = (id) => /^[1-9]\d*$/.test(String(id ?? "")) && Number.isSafeInteger(Number(id));

export function hltbCacheFields(doc) {
  if (!validId(doc.hltb_id)) return null;
  const fields = {
    hltb_id: String(doc.hltb_id),
    hltb_main_hours: positiveTime(doc.hltb_main_hours),
    hltb_main_extra_hours: positiveTime(doc.hltb_main_extra_hours),
    hltb_completionist_hours: positiveTime(doc.hltb_completionist_hours),
  };
  return Object.values(fields).slice(1).some((value) => value !== null) ? fields : null;
}

export function shouldLookupHltb(doc, refresh = false) {
  return refresh || hltbCacheFields(doc) === null;
}

export function mergeHltbCache(doc, result) {
  const fields = result && hltbCacheFields(result);
  return fields ? { ...doc, ...fields } : doc;
}

export function matchHltbCandidate(candidates, title, platform) {
  const wanted = normalizeHltbTitle(title);
  if (!wanted || !Array.isArray(candidates)) return null;
  let matches = candidates.filter((game) => normalizeHltbTitle(game?.name) === wanted);
  // Platform is required to disambiguate identically named releases. If the
  // provider supplies platforms, reject a mismatch even for a single result.
  if (platform) {
    const expected = normalizePlatform(platform);
    matches = matches.filter((game) => typeof game.platforms === "string" &&
      game.platforms.split(",").some((entry) => normalizePlatform(entry) === expected));
  }
  if (matches.length !== 1) return null;
  const game = matches[0];
  const fields = hltbCacheFields({
    hltb_id: game.id,
    hltb_main_hours: game.completionTimes?.main,
    hltb_main_extra_hours: game.completionTimes?.mainExtra,
    hltb_completionist_hours: game.completionTimes?.completionist,
  });
  return fields ? { ...fields, matchedName: game.name, sourceUrl: `https://howlongtobeat.com/game?id=${fields.hltb_id}` } : null;
}

export async function lookupHltb(client, title, { platform, timeoutMs = HLTB_TIMEOUT_MS } = {}) {
  let timer;
  try {
    const candidates = await Promise.race([
      Promise.resolve().then(() => client.search(title, { limit: 5 })),
      new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error(`timed out after ${timeoutMs}ms`)), timeoutMs);
      }),
    ]);
    return matchHltbCandidate(candidates, title, platform);
  } catch (error) {
    console.warn(`  ⚠ HLTB lookup for "${title}" failed: ${error instanceof Error ? error.message : "unknown error"}`);
    return null;
  } finally {
    clearTimeout(timer);
  }
}
