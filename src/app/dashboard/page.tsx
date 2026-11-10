import Link from "next/link";
import { Library } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { GameCard } from "@/components/game-card";
import { Button } from "@/components/ui/button";
import { PageContainer } from "@/components/page-container";
import { computeCompletionPercent } from "@/lib/progress";
import { getLocale } from "@/i18n/get-locale";
import { getDictionary, t } from "@/i18n/get-dictionary";
import { pick } from "@/i18n/pick";
import { filterRouteSections, parseRouteDefinitions, resolveRouteKey, resolveWalkthroughRoutes } from "@/lib/walkthrough-routes";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub ?? "";
  const locale = await getLocale();
  const dict = getDictionary(locale);
  const d = dict.dashboard;

  const { data: tracked } = await supabase
    .from("user_game_progress")
    .select("game_id, selected_route_key")
    .eq("user_id", userId);

  const gameIds = (tracked ?? []).map((row) => row.game_id);

  if (gameIds.length === 0) {
    return (
      <PageContainer className="flex-1 items-center justify-center gap-4 text-center">
        <div className="flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary ring-1 ring-primary/20">
          <Library className="size-7" />
        </div>
        <div className="flex flex-col gap-1">
          <h1 className="text-xl font-semibold">{d.emptyTitle}</h1>
          <p className="text-sm text-muted-foreground">{d.emptyBody}</p>
        </div>
        <Button render={<Link href="/games" />} nativeButton={false}>
          {d.browseCatalog}
        </Button>
      </PageContainer>
    );
  }

  const [{ data: games }, { data: categories }] = await Promise.all([
    supabase
      .from("games")
      .select(
        "id, slug, title, title_i18n, platform, cover_url, hltb_completionist_hours, walkthrough_routes"
      )
      .in("id", gameIds),
    supabase
      .from("checklist_categories")
      .select("id, key, game_id")
      .in("game_id", gameIds),
  ]);

  const categoryToGame = new Map(
    (categories ?? []).map((category) => [category.id, category.game_id])
  );
  const categoryIds = (categories ?? []).map((category) => category.id);

  const { data: items } = categoryIds.length
    ? await supabase
        .from("checklist_items")
        .select("id, key, category_id")
        .in("category_id", categoryIds)
    : { data: [] };

  const itemToGame = new Map(
    (items ?? []).map((item) => [item.id, categoryToGame.get(item.category_id)])
  );
  const itemIds = (items ?? []).map((item) => item.id);

  const { data: progressRows } = itemIds.length
    ? await supabase
        .from("user_item_progress")
        .select("item_id")
        .eq("user_id", userId)
        .eq("completed", true)
        .in("item_id", itemIds)
    : { data: [] };

  const totalByGame = new Map<string, number>();
  for (const item of items ?? []) {
    const gameId = categoryToGame.get(item.category_id);
    if (!gameId) continue;
    totalByGame.set(gameId, (totalByGame.get(gameId) ?? 0) + 1);
  }

  const completedByGame = new Map<string, number>();
  for (const row of progressRows ?? []) {
    const gameId = itemToGame.get(row.item_id);
    if (!gameId) continue;
    completedByGame.set(gameId, (completedByGame.get(gameId) ?? 0) + 1);
  }

  return (
    <PageContainer>
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-semibold tracking-tight">
            {d.yourGames}
          </h1>
          <p className="text-sm text-muted-foreground">
            {t(
              (games?.length ?? 0) === 1
                ? d.gamesInLibrary_one
                : d.gamesInLibrary_other,
              { count: games?.length ?? 0 }
            )}
          </p>
        </div>
        <Button
          render={<Link href="/games" />}
          nativeButton={false}
          variant="outline"
          size="sm"
        >
          {d.browse}
        </Button>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {(games ?? []).map((game) => {
          const sections = (categories ?? []).filter((category) => category.game_id === game.id)
            .map((category) => ({ id: category.id, key: category.key,
              items: (items ?? []).filter((item) => item.category_id === category.id) }));
          const routes = resolveWalkthroughRoutes(parseRouteDefinitions(game.walkthrough_routes), sections,
            (translations, fallback) => pick(translations ?? {}, locale, fallback));
          const routeKey = resolveRouteKey(routes, (tracked ?? []).find((row) => row.game_id === game.id)?.selected_route_key);
          const selectedRoute = routes.find((route) => route.key === routeKey);
          const applicableIds = new Set(filterRouteSections(sections, routes, routeKey).flatMap((section) => section.items.map((item) => item.id)));
          const total = routes.length ? applicableIds.size : totalByGame.get(game.id) ?? 0;
          const completed = routes.length
            ? (progressRows ?? []).filter((row) => applicableIds.has(row.item_id)).length
            : completedByGame.get(game.id) ?? 0;
          const percent = computeCompletionPercent(total, completed);
          return (
            <GameCard
              loadingLabel={dict.common.loading}
              key={game.id}
              title={pick(game.title_i18n, locale, game.title)}
              platform={game.platform}
              href={`/games/${game.slug}`}
              percent={routes.length && !selectedRoute ? undefined : percent}
              completeLabel={dict.games.complete}
              footer={routes.length ? <span className="text-xs text-muted-foreground">{selectedRoute
                ? t(dict.gameDetail.walkthrough.routeSummary, { route: selectedRoute.title, percent })
                : dict.gameDetail.walkthrough.routeChoosePrompt}</span> : undefined}
              coverUrl={game.cover_url}
              completionistBadge={
                game.hltb_completionist_hours != null
                  ? t(dict.games.completionistHours, {
                      hours: game.hltb_completionist_hours,
                    })
                  : null
              }
            />
          );
        })}
      </div>
    </PageContainer>
  );
}
