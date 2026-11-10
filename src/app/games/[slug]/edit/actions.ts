"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getLocale } from "@/i18n/get-locale";
import { getDictionary } from "@/i18n/get-dictionary";
import type { ItemImageUpload } from "@/components/item-image";

export type EditFormState = { error: string | null };
export type ItemDetailsFormState = {
  error: string | null;
  savedDetails?: string;
};

export async function addCategoryAction(
  gameId: string,
  _prevState: EditFormState,
  formData: FormData
): Promise<EditFormState> {
  const title = ((formData.get("title") as string) ?? "").trim();
  const locale = await getLocale();
  const dict = getDictionary(locale);
  if (!title) return { error: dict.editChecklist.categoryTitleRequired };

  const supabase = await createClient();

  const { count } = await supabase
    .from("checklist_categories")
    .select("id", { count: "exact", head: true })
    .eq("game_id", gameId);

  const { error } = await supabase.from("checklist_categories").insert({
    game_id: gameId,
    title,
    title_i18n: { [locale]: title },
    order_index: count ?? 0,
  });

  if (error) return { error: error.message };

  revalidatePath("/games/[slug]/edit", "page");
  revalidatePath("/games/[slug]", "page");
  return { error: null };
}

const ITEM_IMAGES_BUCKET = "checklist-images";

// Both item guidance and signed image uploads require the owning game, in
// addition to the database's existing ownership policies.
async function requireOwnedItem(itemId: string) {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;
  if (!userId) throw new Error("Unauthorized");

  const { data: item, error: itemError } = await supabase
    .from("checklist_items")
    .select("category_id, details, details_i18n")
    .eq("id", itemId)
    .maybeSingle();
  if (itemError) throw itemError;
  const { data: category } = item
    ? await supabase.from("checklist_categories").select("game_id")
        .eq("id", item.category_id).maybeSingle()
    : { data: null };
  const { data: game } = category
    ? await supabase.from("games").select("id, created_by")
        .eq("id", category.game_id).maybeSingle()
    : { data: null };
  if (!item || !game || game.created_by !== userId) throw new Error("Forbidden");
  return { supabase, userId, item, game };
}

export async function saveItemDetailsAction(
  itemId: string,
  _previousState: ItemDetailsFormState,
  formData: FormData
): Promise<ItemDetailsFormState> {
  const locale = await getLocale();
  const dict = getDictionary(locale);
  const value = formData.get("details");
  if (typeof value !== "string") return { error: dict.editChecklist.itemDetailsError };
  const details = value.trim();

  try {
    const { supabase, item } = await requireOwnedItem(itemId);
    const previous = item.details_i18n;
    const translations: Record<string, string> = {};
    if (previous && typeof previous === "object" && !Array.isArray(previous)) {
      for (const [language, text] of Object.entries(previous)) {
        if (typeof text === "string") translations[language] = text;
      }
    }
    const previousLocale = translations[locale];
    if (details) translations[locale] = details;
    else delete translations[locale];

    // Prefer English, preserve unrelated legacy text, and never leave the
    // just-cleared locale's old text behind in the plain fallback column.
    const fallback = translations.en ||
      (locale !== "en" && item.details !== previousLocale ? item.details : null) ||
      Object.values(translations).find((text) => text.trim()) || null;
    const { error } = await supabase.from("checklist_items")
      .update({ details: fallback, details_i18n: translations }).eq("id", itemId);
    if (error) return { error: dict.editChecklist.itemDetailsError };
  } catch {
    return { error: dict.editChecklist.itemDetailsError };
  }

  revalidatePath("/games/[slug]/edit", "page");
  revalidatePath("/games/[slug]", "page");
  return { error: null, savedDetails: details };
}

// Mint a one-time signed upload URL for a checklist item's image.
//
// The auth cookies are HttpOnly (see cookie-options.ts), so the browser
// Supabase client has no session and can't upload under the storage RLS
// policy itself. Instead the server, which can read the session, checks that
// the caller owns the item's game and signs a path under their uid folder
// ({uid}/{gameId}/{itemId}/{file}, which checklist_images_insert_own also
// enforces when the URL is signed). The browser then sends the file straight
// to Storage with uploadToSignedUrl, so the body never goes through a Server
// Action (capped at ~1MB).
export async function createItemImageUploadAction(
  itemId: string,
  fileName: string,
  contentType: string
): Promise<ItemImageUpload> {
  if (!contentType.startsWith("image/")) throw new Error("Not an image");

  const { supabase, userId, game } = await requireOwnedItem(itemId);

  const dot = fileName.lastIndexOf(".");
  const ext =
    (dot >= 0 ? fileName.slice(dot + 1) : "")
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "")
      .slice(0, 10) || "png";
  const path = `${userId}/${game.id}/${itemId}/${crypto.randomUUID()}.${ext}`;

  const storage = supabase.storage.from(ITEM_IMAGES_BUCKET);
  const { data, error } = await storage.createSignedUploadUrl(path);
  if (error) throw new Error(error.message);
  const {
    data: { publicUrl },
  } = storage.getPublicUrl(data.path);

  return { path: data.path, token: data.token, publicUrl };
}

// Persist (or clear) a checklist item's image URL. The file itself is uploaded
// client-side straight to Storage (via createItemImageUploadAction's signed
// URL); this only saves the resulting public URL.
// RLS (checklist_items_update_own_game) ensures only the game owner can write.
export async function setItemImageAction(
  itemId: string,
  imageUrl: string | null
): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("checklist_items")
    .update({ image_url: imageUrl })
    .eq("id", itemId);
  if (error) throw new Error(error.message);

  revalidatePath("/games/[slug]/edit", "page");
  revalidatePath("/games/[slug]", "page");
}

// Trophies are a separate system from the checklist categories/items above —
// own table, own RLS — added here only because they share the same edit page.
export async function addTrophyAction(
  gameId: string,
  _prevState: EditFormState,
  formData: FormData
): Promise<EditFormState> {
  const title = ((formData.get("title") as string) ?? "").trim();
  const description = ((formData.get("description") as string) ?? "").trim();
  const tier = ((formData.get("tier") as string) ?? "bronze").trim();
  const locale = await getLocale();
  const dict = getDictionary(locale);
  if (!title) return { error: dict.trophies.edit.titleRequired };

  const supabase = await createClient();

  const { count } = await supabase
    .from("trophies")
    .select("id", { count: "exact", head: true })
    .eq("game_id", gameId);

  const { error } = await supabase.from("trophies").insert({
    game_id: gameId,
    title,
    title_i18n: { [locale]: title },
    description: description || null,
    description_i18n: description ? { [locale]: description } : {},
    tier,
    order_index: count ?? 0,
  });

  if (error) return { error: error.message };

  revalidatePath("/games/[slug]/edit", "page");
  revalidatePath("/games/[slug]", "page");
  return { error: null };
}

export async function addItemAction(
  categoryId: string,
  _prevState: EditFormState,
  formData: FormData
): Promise<EditFormState> {
  const title = ((formData.get("title") as string) ?? "").trim();
  const description = ((formData.get("description") as string) ?? "").trim();
  const details = String(formData.get("details") ?? "").trim();
  const locale = await getLocale();
  const dict = getDictionary(locale);
  if (!title) return { error: dict.editChecklist.itemTitleRequired };

  const supabase = await createClient();

  const { count } = await supabase
    .from("checklist_items")
    .select("id", { count: "exact", head: true })
    .eq("category_id", categoryId);

  const { error } = await supabase.from("checklist_items").insert({
    category_id: categoryId,
    title,
    title_i18n: { [locale]: title },
    description: description || null,
    description_i18n: description ? { [locale]: description } : {},
    details: details || null,
    details_i18n: details ? { [locale]: details } : {},
    order_index: count ?? 0,
  });

  if (error) return { error: error.message };

  revalidatePath("/games/[slug]/edit", "page");
  revalidatePath("/games/[slug]", "page");
  return { error: null };
}
