/** Stable curator references identify a task within its category. */
export type RouteItemRef = { category_key: string; item_key: string };
export type RouteDefinition = {
  key: string;
  title: string;
  title_i18n?: Record<string, string>;
  details?: string | null;
  details_i18n?: Record<string, string>;
  item_refs: RouteItemRef[];
  replay_from?: RouteItemRef | null;
};

export type WalkthroughRoute = {
  key: string;
  title: string;
  details: string | null;
  itemIds: string[];
  replayFrom: { chapterId: string; itemId: string } | null;
};

type ReferencedChapter = {
  id: string;
  key?: string | null;
  items: { id: string; key?: string | null }[];
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === "object" && !Array.isArray(value);
const isRef = (value: unknown): value is RouteItemRef =>
  isRecord(value) && typeof value.category_key === "string" && !!value.category_key &&
  typeof value.item_key === "string" && !!value.item_key;
const isTextMap = (value: unknown) => value === undefined ||
  (isRecord(value) && Object.values(value).every((text) => typeof text === "string"));

/** Malformed stored definitions fail closed, rather than exposing other branches. */
export function parseRouteDefinitions(value: unknown): RouteDefinition[] {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value)) throw new Error("Invalid walkthrough route configuration");
  const seen = new Set<string>();
  const definitions: RouteDefinition[] = [];
  for (const route of value) {
    if (!isRecord(route) || typeof route.key !== "string" || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(route.key) ||
      route.key === "common" || seen.has(route.key) || typeof route.title !== "string" || !route.title.trim() ||
      !Array.isArray(route.item_refs) || !route.item_refs.length || !route.item_refs.every(isRef) ||
      !isTextMap(route.title_i18n) || !isTextMap(route.details_i18n) ||
      (route.details !== undefined && route.details !== null && typeof route.details !== "string") ||
      (route.replay_from !== undefined && route.replay_from !== null && !isRef(route.replay_from))) throw new Error("Invalid walkthrough route configuration");
    seen.add(route.key);
    definitions.push(route as RouteDefinition);
  }
  return definitions;
}

/** Resolve keys once on the server; the client never guesses title-based links. */
export function resolveWalkthroughRoutes(
  definitions: RouteDefinition[],
  sections: ReferencedChapter[],
  localize: (translations: Record<string, string> | undefined, fallback: string) => string = (_map, fallback) => fallback
): WalkthroughRoute[] {
  function locate(ref: RouteItemRef) {
    const chapter = sections.find((section) => section.key === ref.category_key);
    const item = chapter?.items.find((step) => step.key === ref.item_key);
    return chapter && item ? { chapterId: chapter.id, itemId: item.id } : null;
  }
  const resolved: WalkthroughRoute[] = [];
  for (const route of definitions) {
    const targets = route.item_refs.map(locate);
    const replayFrom = route.replay_from ? locate(route.replay_from) : null;
    // One broken route invalidates the configuration. Dropping just that route
    // would accidentally turn its exclusive tasks into common tasks.
    if (targets.some((target) => !target) || (route.replay_from && !replayFrom)) throw new Error("Unresolved walkthrough route reference");
    resolved.push({ key: route.key, title: localize(route.title_i18n, route.title),
      details: localize(route.details_i18n, route.details ?? "").trim() || null,
      itemIds: [...new Set(targets.map((target) => target!.itemId))], replayFrom });
  }
  return resolved;
}

export function resolveRouteKey(routes: WalkthroughRoute[], key: unknown): string | null {
  return typeof key === "string" && routes.some((route) => route.key === key) ? key : null;
}

/** Shared steps count once. Unselected/incompatible alternatives never count. */
export function filterRouteSections<T extends { id: string; items: { id: string }[] }>(
  sections: T[], routes: WalkthroughRoute[], key: string | null
): T[] {
  if (!routes.length) return sections;
  const alternatives = new Set(routes.flatMap((route) => route.itemIds));
  const included = new Set(routes.find((route) => route.key === key)?.itemIds ?? []);
  return sections.map((section) => ({ ...section,
    items: section.items.filter((item) => !alternatives.has(item.id) || included.has(item.id)),
  })).filter((section) => section.items.length > 0);
}
