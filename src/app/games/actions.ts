"use server";

import { getSession } from "@/lib/auth/session";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { slugify } from "@/lib/slug";
import { getLocale } from "@/i18n/get-locale";
import { getDictionary } from "@/i18n/get-dictionary";

export async function addGameToLibraryAction(gameId: string) {
  const supabase = await createClient();
  const claims = await getSession();
  const userId = claims?.sub;
  if (!userId) redirect("/login");

  // Idempotent: adding a game already in the library is a no-op, not an error.
  await supabase
    .from("user_game_progress")
    .upsert(
      { user_id: userId, game_id: gameId },
      { onConflict: "user_id,game_id", ignoreDuplicates: true }
    );

  revalidatePath("/games");
  revalidatePath("/dashboard");
}

export type CreateGameState = { error: string | null };

export async function createGameAction(
  _prevState: CreateGameState,
  formData: FormData
): Promise<CreateGameState> {
  const title = ((formData.get("title") as string) ?? "").trim();
  const platform = ((formData.get("platform") as string) ?? "").trim();
  const coverUrl = ((formData.get("cover_url") as string) ?? "").trim();

  const locale = await getLocale();
  const dict = getDictionary(locale);

  if (!title || !platform) {
    return { error: dict.newGame.errors.required };
  }

  const supabase = await createClient();
  const claims = await getSession();
  const userId = claims?.sub;
  if (!userId) redirect("/login");

  const slug = slugify(title);

  const { error } = await supabase.from("games").insert({
    title,
    title_i18n: { [locale]: title },
    platform,
    slug,
    cover_url: coverUrl || null,
    created_by: userId,
  });

  if (error) {
    if (error.code === "23505") {
      return { error: dict.newGame.errors.duplicate };
    }
    return { error: error.message };
  }

  revalidatePath("/games");
  redirect(`/games/${slug}/edit`);
}
