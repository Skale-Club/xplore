import Link from "next/link";
import { notFound } from "next/navigation";
import { Pencil } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { GameGuides } from "@/components/game-guides";
import { localizeGameGuides, parseGameGuides } from "@/lib/game-guides";
import { GameHero } from "@/components/game-hero";
import { HltbStats } from "@/components/hltb-stats";
import { TrophyList } from "@/components/trophy-list";
import { Walkthrough } from "@/components/walkthrough";
import {
  WalkthroughProgressProvider,
  WalkthroughSummary,
} from "@/components/walkthrough-progress";
import { Button } from "@/components/ui/button";
import { PageContainer } from "@/components/page-container";
import { GameTabPanel, GameTabSwitch, GameTabs } from "@/components/game-tabs";
import { getLocale } from "@/i18n/get-locale";
import { getDictionary } from "@/i18n/get-dictionary";
import { pick } from "@/i18n/pick";
import { asChapterKind, findNextStep, storyChapters } from "@/lib/walkthrough";
import { filterRouteSections, parseRouteDefinitions, resolveRouteKey, resolveWalkthroughRoutes } from "@/lib/walkthrough-routes";
import {
  setItemsCompletionAction,
  toggleItemCompletionAction,
  toggleTrophyCompletionAction,
  selectWalkthroughRouteAction,
} from "./actions";

export default async function GameDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ c?: string; route?: string }>;
}) {
  const { slug } = await params;
  const { c, route: requestedRoute } = await searchParams;
  const supabase = await createClient();
  const locale = await getLocale();
  const dict = getDictionary(locale);
  const d = dict.gameDetail;
  const td = dict.trophies;

  const { data: game } = await supabase
    .from("games")
    .select(
      "id, slug, title, title_i18n, platform, cover_url, created_by, hltb_main_hours, hltb_main_extra_hours, hltb_completionist_hours, walkthrough_routes, guides"
    )
    .eq("slug", slug)
    .maybeSingle();

  if (!game) notFound();

  const { data: categories } = await supabase
    .from("checklist_categories")
    .select("id, key, kind, title, title_i18n, order_index")
    .eq("game_id", game.id)
    .order("order_index");

  const categoryIds = (categories ?? []).map((category) => category.id);

  const { data: items } = categoryIds.length
    ? await supabase
        .from("checklist_items")
        .select(
          "id, key, category_id, title, title_i18n, description, description_i18n, details, details_i18n, image_url, order_index"
        )
        .in("category_id", categoryIds)
        .order("order_index")
    : { data: [] };

  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;
  const { data: library } = await supabase.from("user_game_progress")
    .select("selected_route_key").eq("user_id", userId ?? "").eq("game_id", game.id).maybeSingle();
  const itemIds = (items ?? []).map((item) => item.id);

  const { data: progressRows } = itemIds.length
    ? await supabase
        .from("user_item_progress")
        .select("item_id, completed, completed_at")
        .eq("user_id", userId ?? "")
        .in("item_id", itemIds)
    : { data: [] };

  // The step the player ticked most recently — the anchor for "where they
  // left off" (see findNextStep).
  const lastCompletedId =
    (progressRows ?? [])
      .filter((row) => row.completed && row.completed_at)
      .sort((a, b) => (b.completed_at ?? "").localeCompare(a.completed_at ?? ""))[0]
      ?.item_id ?? null;

  const completedIds = new Set(
    (progressRows ?? []).filter((row) => row.completed).map((row) => row.item_id)
  );

  const categoriesWithItems = (categories ?? []).map((category) => ({
    id: category.id,
    key: category.key,
    kind: asChapterKind(category.kind),
    title: pick(category.title_i18n, locale, category.title),
    items: (items ?? [])
      .filter((item) => item.category_id === category.id)
      .map((item) => ({
        id: item.id,
        key: item.key,
        title: pick(item.title_i18n, locale, item.title),
        description: item.description
          ? pick(item.description_i18n, locale, item.description)
          : null,
        imageUrl: item.image_url,
        details: pick(item.details_i18n, locale, item.details ?? "").trim() || null,
        completed: completedIds.has(item.id),
      })),
  }));

  const routes = resolveWalkthroughRoutes(parseRouteDefinitions(game.walkthrough_routes), categoriesWithItems,
    (translations, fallback) => pick(translations ?? {}, locale, fallback));
  const initialRouteKey = requestedRoute === "common" ? null :
    resolveRouteKey(routes, requestedRoute) ?? resolveRouteKey(routes, library?.selected_route_key);
  const applicableSections = filterRouteSections(categoriesWithItems, routes, initialRouteKey);

  const isOwner = game.created_by === userId;
  const title = pick(game.title_i18n, locale, game.title);

  // An explicit ?c= (a refresh while browsing) always wins. Otherwise resume
  // where the player left off: the chapter holding their next step.
  const requestedSectionId = applicableSections.find((section) => section.id === c)?.id;
  const resumeSectionId = findNextStep(storyChapters(applicableSections), completedIds, lastCompletedId)
    ?.section.id;
  const initialSectionId =
    requestedSectionId ?? resumeSectionId ?? applicableSections[0]?.id ?? "";

  // Trophies are a separate system from the checklist above — their own
  // table and their own progress, fetched independently and never mixed in.
  const { data: trophies } = await supabase
    .from("trophies")
    .select("id, title, title_i18n, description, description_i18n, tier, order_index")
    .eq("game_id", game.id)
    .order("order_index");

  const trophyIds = (trophies ?? []).map((trophy) => trophy.id);

  const { data: trophyProgressRows } = trophyIds.length
    ? await supabase
        .from("user_trophy_progress")
        .select("trophy_id, completed")
        .eq("user_id", userId ?? "")
        .in("trophy_id", trophyIds)
    : { data: [] };

  const completedTrophyIds = new Set(
    (trophyProgressRows ?? [])
      .filter((row) => row.completed)
      .map((row) => row.trophy_id)
  );

  const trophiesWithProgress = (trophies ?? []).map((trophy) => ({
    id: trophy.id,
    title: pick(trophy.title_i18n, locale, trophy.title),
    description: trophy.description
      ? pick(trophy.description_i18n, locale, trophy.description)
      : null,
    tier: trophy.tier,
    completed: completedTrophyIds.has(trophy.id),
  }));

  const guides = localizeGameGuides(parseGameGuides(game.guides), locale);
  const showGuidesTab = guides.length > 0;
  const showTrophiesTab = trophiesWithProgress.length > 0 || isOwner;
  // A single "Walkthrough" tab is just noise — only show the switch when
  // there is a second tab. It sits in each panel's own toolbar row.
  const tabSwitch = showTrophiesTab || showGuidesTab ? (
    <GameTabSwitch labels={{ detonado: td.detonadoTabLabel, ...(showTrophiesTab ? { trophies: td.tabLabel } : {}), ...(showGuidesTab ? { guides: d.guides.tabLabel } : {}) }} />
  ) : null;

  return (
    <PageContainer>
      {/* Shares live completion between the header ring and the checklist. */}
      <WalkthroughProgressProvider sections={categoriesWithItems} lastCompletedId={lastCompletedId} routes={routes} initialRouteKey={initialRouteKey}>
      <GameHero
        title={title}
        platform={game.platform}
        coverUrl={game.cover_url}
        progress={
          categoriesWithItems.length > 0 ? <WalkthroughSummary labels={d} /> : undefined
        }
        stats={
          <HltbStats
            title={d.hltb.title}
            mainStoryLabel={d.hltb.mainStory}
            mainExtraLabel={d.hltb.mainExtra}
            completionistLabel={d.hltb.completionist}
            mainHours={game.hltb_main_hours}
            mainExtraHours={game.hltb_main_extra_hours}
            completionistHours={game.hltb_completionist_hours}
          />
        }
        actions={
          isOwner ? (
            <Button
              render={<Link href={`/games/${slug}/edit`} />}
              nativeButton={false}
              variant="outline"
              size="lg"
              className="h-10 bg-background/60 px-4 backdrop-blur-sm"
            >
              <Pencil />
              {d.editChecklist}
            </Button>
          ) : undefined
        }
      />

      <GameTabs>
        <GameTabPanel value="detonado">
          {categoriesWithItems.length === 0 ? (
            <div className="flex flex-col gap-4">
            {tabSwitch}
            <p className="text-muted-foreground">
              {d.noChecklistOwner}{" "}
              {isOwner ? (
                <>
                  <Link
                    href={`/games/${slug}/edit`}
                    className="underline underline-offset-4"
                  >
                    {d.addCategoriesItems}
                  </Link>{" "}
                  {d.toGetStarted}
                </>
              ) : (
                d.noChecklistOther
              )}
            </p>
            </div>
          ) : (
            <Walkthrough
              sections={categoriesWithItems}
              initialSectionId={initialSectionId}
              resumeOnMount={!requestedSectionId}
              labels={d}
              toggleAction={toggleItemCompletionAction}
              bulkAction={setItemsCompletionAction}
              saveRouteAction={selectWalkthroughRouteAction.bind(null, game.id)}
              toolbarLeading={tabSwitch}
            />
          )}
        </GameTabPanel>

        {showTrophiesTab && (
          <GameTabPanel value="trophies">
            {trophiesWithProgress.length === 0 ? (
              <div className="flex flex-col gap-4">
              {tabSwitch}
              <p className="text-muted-foreground">
                {td.empty}{" "}
                <Link
                  href={`/games/${slug}/edit`}
                  className="underline underline-offset-4"
                >
                  {td.addTrophies}
                </Link>{" "}
                {d.toGetStarted}
              </p>
              </div>
            ) : (
              <TrophyList
                trophies={trophiesWithProgress}
                toggleAction={toggleTrophyCompletionAction}
                labels={td}
                toolbarLeading={tabSwitch}
              />
            )}
          </GameTabPanel>
        )}
        {showGuidesTab && <GameTabPanel value="guides">
          <GameGuides guides={guides} labels={d.guides} toolbarLeading={tabSwitch} />
        </GameTabPanel>}
      </GameTabs>
      </WalkthroughProgressProvider>
    </PageContainer>
  );
}
