// Curated guides are read-only content, independent from checklist progress.
export const GUIDE_TOPICS = ["basics", "combat", "equipment", "alchemy", "exploration", "gwent", "progression"];

export function validateGuideArray(value) {
  if (value === null) return [];
  if (!Array.isArray(value)) throw new Error("guides must be an array or null");
  const keys = new Set();
  return value.map((guide) => {
    if (!guide || typeof guide !== "object" || Array.isArray(guide) ||
        typeof guide.key !== "string" || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(guide.key) || keys.has(guide.key)) {
      throw new Error("Each guide needs a unique stable kebab-case key");
    }
    if (!GUIDE_TOPICS.includes(guide.topic)) throw new Error(`Guide ${guide.key} has an invalid topic`);
    keys.add(guide.key);
    for (const field of ["title", "summary", "body"]) {
      const translations = guide[`${field}_i18n`];
      if (typeof guide[field] !== "string" || !guide[field].trim() || !translations ||
          typeof translations !== "object" || Array.isArray(translations) ||
          !Object.values(translations).every((text) => typeof text === "string") ||
          typeof translations.en !== "string" || !translations.en.trim() ||
          typeof translations.pt !== "string" || !translations.pt.trim() || guide[field] !== translations.en) {
        throw new Error(`Guide ${guide.key} needs bilingual ${field} and an identical English fallback`);
      }
    }
    return guide;
  });
}

/** Absence preserves stored guides; explicit null/[] clears them. */
export function validateGuides(doc) {
  return Object.prototype.hasOwnProperty.call(doc, "guides") ? validateGuideArray(doc.guides) : undefined;
}
