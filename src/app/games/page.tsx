import Link from "next/link";
import { Check, Plus, Gamepad2 } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { GameCard } from "@/components/game-card";
import { Button } from "@/components/ui/button";
import { PageContainer } from "@/components/page-container";
import { getLocale } from "@/i18n/get-locale";
import { getDictionary, t } from "@/i18n/get-dictionary";
import { pick } from "@/i18n/pick";
import { addGameToLibraryAction } from "./actions";

export default async function GamesPage() {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;
  const locale = await getLocale();
  const dict = getDictionary(locale);
  const d = dict.games;

  const [{ data: games }, { data: tracked }] = await Promise.all([
    supabase
      .from("games")
      .select(
        "id, slug, title, title_i18n, platform, cover_url, hltb_completionist_hours"
      )
      .order("title"),
    supabase
      .from("user_game_progress")
      .select("game_id")
      .eq("user_id", userId ?? ""),
  ]);

  const trackedIds = new Set((tracked ?? []).map((row) => row.game_id));

  return (
    <PageContainer>
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-semibold tracking-tight">
            {d.title}
          </h1>
          <p className="text-sm text-muted-foreground">{d.subtitle}</p>
        </div>
        <Button render={<Link href="/games/new" />} nativeButton={false} size="sm">
          <Plus />
          {d.newGame}
        </Button>
      </div>

      {!games || games.length === 0 ? (
        <div className="flex flex-col items-center gap-4 rounded-2xl border border-dashed p-10 text-center">
          <div className="flex size-12 items-center justify-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/20">
            <Gamepad2 className="size-6" />
          </div>
          <div className="flex flex-col gap-1">
            <p className="font-medium">{d.emptyTitle}</p>
            <p className="text-sm text-muted-foreground">{d.emptyBody}</p>
          </div>
          <Button render={<Link href="/games/new" />} nativeButton={false} size="sm">
            <Plus />
            {d.newGame}
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {games.map((game) => {
            const isTracked = trackedIds.has(game.id);
            return (
              <GameCard
                loadingLabel={dict.common.loading}
                key={game.id}
                title={pick(game.title_i18n, locale, game.title)}
                platform={game.platform}
                href={`/games/${game.slug}`}
                coverUrl={game.cover_url}
                completeLabel={d.complete}
                completionistBadge={
                  game.hltb_completionist_hours != null
                    ? t(d.completionistHours, {
                        hours: game.hltb_completionist_hours,
                      })
                    : null
                }
                footer={
                  isTracked ? (
                    <span className="inline-flex items-center gap-1.5 text-sm font-medium text-success">
                      <Check className="size-4" />
                      {d.inLibrary}
                    </span>
                  ) : (
                    <form action={addGameToLibraryAction.bind(null, game.id)}>
                      <Button type="submit" size="sm" variant="outline">
                        <Plus />
                        {d.addToLibrary}
                      </Button>
                    </form>
                  )
                }
              />
            );
          })}
        </div>
      )}
    </PageContainer>
  );
}
