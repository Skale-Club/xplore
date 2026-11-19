export const GUIDE_TOPICS = ["basics", "combat", "equipment", "alchemy", "exploration", "gwent", "progression"] as const;
export type GuideTopic = typeof GUIDE_TOPICS[number];
export type GameGuide = {
  key: string;
  topic: GuideTopic;
  title: string;
  title_i18n: Record<string, string>;
  summary: string;
  summary_i18n: Record<string, string>;
  body: string;
  body_i18n: Record<string, string>;
};
export type LocalizedGameGuide = Pick<GameGuide, "key" | "topic" | "title" | "summary" | "body">;
const record = (value: unknown): value is Record<string, unknown> => !!value && typeof value === "object" && !Array.isArray(value);

/** Invalid stored entries are ignored without exposing unvalidated content. */
export function parseGameGuides(value: unknown): GameGuide[] {
  if (!Array.isArray(value)) return [];
  const keys = new Set<string>();
  return value.filter((guide): guide is GameGuide => {
    if (!record(guide) || typeof guide.key !== "string" || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(guide.key) ||
        keys.has(guide.key) || !GUIDE_TOPICS.includes(guide.topic as GuideTopic)) return false;
    for (const field of ["title", "summary", "body"]) {
      const text = guide[field];
      const map = guide[`${field}_i18n`];
      if (typeof text !== "string" || !text.trim() || !record(map) ||
          !Object.values(map).every((entry) => typeof entry === "string") ||
          typeof map.en !== "string" || !map.en.trim() || typeof map.pt !== "string" || !map.pt.trim() || map.en !== text) return false;
    }
    keys.add(guide.key);
    return true;
  });
}

export function localizeGameGuides(guides: GameGuide[], locale: string): LocalizedGameGuide[] {
  return guides.map((guide) => ({ key: guide.key, topic: guide.topic,
    title: guide.title_i18n[locale]?.trim() || guide.title,
    summary: guide.summary_i18n[locale]?.trim() || guide.summary,
    body: guide.body_i18n[locale]?.trim() || guide.body,
  }));
}

const normalize = (text: string) => text.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase().trim();
/** Bodies may contain spoilers and are never part of search matching. */
export function searchGameGuides(guides: LocalizedGameGuide[], query: string, topic: GuideTopic | "all" = "all") {
  const needle = normalize(query);
  return guides.filter((guide) => (topic === "all" || guide.topic === topic) &&
    (!needle || normalize(`${guide.title} ${guide.summary}`).includes(needle)));
}
