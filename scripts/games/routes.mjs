// Validate the complete route graph before an importer can write any game row.
const keyPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const record = (v) => !!v && typeof v === "object" && !Array.isArray(v);
const refKey = (ref) => JSON.stringify([ref.category_key, ref.item_key]);
const textMap = (v) => record(v) && ["en", "pt"].every((locale) => typeof v[locale] === "string" && v[locale].trim());
export function validateRoutes(doc) {
  if (!Object.hasOwn(doc, "routes")) return undefined;
  if (doc.routes === null) return [];
  if (!Array.isArray(doc.routes)) throw new Error("routes must be an array or null");
  const available = new Set();
  const categoryKeys = new Set();
  for (const category of doc.categories ?? []) {
    if (categoryKeys.has(category.key)) throw new Error("Duplicate category key in route source");
    categoryKeys.add(category.key);
    for (const item of category.items ?? []) {
      const key = refKey({ category_key: category.key, item_key: item.key });
      if (available.has(key)) throw new Error("Duplicate item key in route source");
      available.add(key);
    }
  }
  const checkRef = (ref) => {
    if (!record(ref) || typeof ref.category_key !== "string" || typeof ref.item_key !== "string" || !available.has(refKey(ref)))
      throw new Error("Route references a missing category/item key");
    return refKey(ref);
  };
  const keys = new Set();
  for (const route of doc.routes) {
    if (!record(route) || typeof route.key !== "string" || !keyPattern.test(route.key) || route.key === "common" || keys.has(route.key)) throw new Error("Invalid or duplicate route key");
    keys.add(route.key);
    if (typeof route.title !== "string" || !route.title.trim() || !textMap(route.title_i18n) || route.title_i18n.en !== route.title) throw new Error("Route titles need EN/PT and the English fallback");
    if (typeof route.details !== "string" || !route.details.trim() || !textMap(route.details_i18n) || route.details_i18n.en !== route.details) throw new Error("Route preparation/replay guidance needs EN/PT and the English fallback");
    if (!Array.isArray(route.item_refs) || !route.item_refs.length) throw new Error("A route needs at least one distinct goal");
    const refs = route.item_refs.map(checkRef);
    if (new Set(refs).size !== refs.length) throw new Error("Duplicate route item reference");
    if (route.replay_from != null) checkRef(route.replay_from);
  }
  const exclusive = new Set(doc.routes.flatMap((route) => route.item_refs.map(refKey)));
  for (const route of doc.routes) {
    if (route.replay_from && exclusive.has(refKey(route.replay_from)) && !route.item_refs.some((ref) => refKey(ref) === refKey(route.replay_from)))
      throw new Error("Replay point is inaccessible from this route");
  }
  return doc.routes;
}
