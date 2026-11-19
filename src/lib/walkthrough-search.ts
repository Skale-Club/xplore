type SearchableChapter = {
  title: string;
  items: { id: string; title: string }[];
};

function normalizeSearch(value: string): string {
  return value.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase().trim();
}

/** Preserve chapter order and original indices so progress remains aligned. */
export function searchWalkthroughChapters<C extends SearchableChapter>(
  sections: C[],
  query: string
): { section: C; index: number; items: SearchableChapter["items"] }[] {
  const needle = normalizeSearch(query);
  return sections.flatMap((section, index) => {
    // An empty search is the compact chapter index, never every task.
    if (!needle) return [{ section, index, items: [] }];
    const items = section.items.filter((item) => normalizeSearch(item.title).includes(needle));
    return normalizeSearch(section.title).includes(needle) || items.length
      ? [{ section, index, items }]
      : [];
  });
}
