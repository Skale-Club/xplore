import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { AddCategoryForm } from "@/components/add-category-form";
import { AddItemForm } from "@/components/add-item-form";
import { AddTrophyForm } from "@/components/add-trophy-form";
import { ItemImage } from "@/components/item-image";
import { ItemDetailsEditor } from "@/components/item-details-editor";
import { PageContainer } from "@/components/page-container";
import { getLocale } from "@/i18n/get-locale";
import { getDictionary, t } from "@/i18n/get-dictionary";
import { pick } from "@/i18n/pick";
import {
  addCategoryAction,
  addItemAction,
  addTrophyAction,
  createItemImageUploadAction,
  setItemImageAction,
  saveItemDetailsAction,
} from "./actions";

export default async function EditGamePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await createClient();
  const locale = await getLocale();
  const dict = getDictionary(locale);
  const d = dict.editChecklist;

  const { data: game } = await supabase
    .from("games")
    .select("id, title, title_i18n, created_by")
    .eq("slug", slug)
    .maybeSingle();

  if (!game) notFound();

  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;
  if (game.created_by !== userId) redirect(`/games/${slug}`);

  const gameTitle = pick(game.title_i18n, locale, game.title);

  const { data: categories } = await supabase
    .from("checklist_categories")
    .select("id, title, title_i18n, order_index")
    .eq("game_id", game.id)
    .order("order_index");

  const categoryIds = (categories ?? []).map((category) => category.id);

  const { data: items } = categoryIds.length
    ? await supabase
        .from("checklist_items")
        .select(
          "id, category_id, title, title_i18n, description, description_i18n, details, details_i18n, image_url, order_index"
        )
        .in("category_id", categoryIds)
        .order("order_index")
    : { data: [] };

  const itemLabels = {
    titlePlaceholder: d.itemTitlePlaceholder,
    descPlaceholder: d.itemDescPlaceholder,
    detailsLabel: d.itemDetailsLabel,
    detailsPlaceholder: d.itemDetailsPlaceholder,
    add: d.addItem,
    adding: d.adding,
  };

  const td = dict.trophies;

  const { data: trophies } = await supabase
    .from("trophies")
    .select("id, title, title_i18n, description, description_i18n, tier, order_index")
    .eq("game_id", game.id)
    .order("order_index");

  const imageLabels = {
    add: d.itemImageAdd,
    change: d.itemImageChange,
    remove: d.itemImageRemove,
    uploading: d.itemImageUploading,
    error: d.itemImageError,
  };
  const detailsLabels = {
    label: d.itemDetailsLabel,
    placeholder: d.itemDetailsPlaceholder,
    save: d.itemDetailsSave,
    saving: d.itemDetailsSaving,
    saved: d.itemDetailsSaved,
  };

  return (
    <PageContainer>
      <div className="flex flex-col gap-1">
        <Link
          href={`/games/${slug}`}
          className="flex w-fit items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ChevronLeft className="size-4" />
          {t(d.backTo, { title: gameTitle })}
        </Link>
        <h1 className="font-heading text-2xl font-semibold tracking-tight">
          {d.title}
        </h1>
      </div>

      <div className="flex flex-col gap-4">
        {(categories ?? []).map((category) => {
          const categoryItems = (items ?? []).filter(
            (item) => item.category_id === category.id
          );
          return (
            <div
              key={category.id}
              className="flex flex-col gap-3 rounded-xl border bg-card p-4"
            >
              <h2 className="font-heading text-base font-semibold">
                {pick(category.title_i18n, locale, category.title)}
              </h2>
              {categoryItems.length > 0 ? (
                <ul className="flex flex-col gap-1 text-sm">
                  {categoryItems.map((item) => {
                    const title = pick(item.title_i18n, locale, item.title);
                    const description = item.description
                      ? pick(item.description_i18n, locale, item.description)
                      : null;
                    // Edit only this locale; do not accidentally save a displayed
                    // fallback translation over another language.
                    const detailsMap = item.details_i18n;
                    const localizedDetails = detailsMap && typeof detailsMap === "object" &&
                      !Array.isArray(detailsMap) && typeof detailsMap[locale] === "string"
                      ? detailsMap[locale] as string
                      : locale === "en" && (!detailsMap || typeof detailsMap !== "object" ||
                          Object.keys(detailsMap).length === 0) ? item.details ?? "" : "";
                    return (
                      <li
                        key={item.id}
                        className="flex flex-col gap-1.5 text-muted-foreground"
                      >
                        <div className="flex items-start gap-2">
                          <span className="mt-1.5 size-1 shrink-0 rounded-full bg-muted-foreground/50" />
                          <span>
                            <span className="text-foreground">{title}</span>
                            {description ? ` — ${description}` : ""}
                          </span>
                        </div>
                        <div className="pl-3">
                          <ItemImage
                            itemId={item.id}
                            imageUrl={item.image_url}
                            labels={imageLabels}
                            onRequestUpload={createItemImageUploadAction}
                            onPersist={setItemImageAction}
                          />
                          <ItemDetailsEditor
                            key={`${item.id}:${locale}`}
                            itemId={item.id}
                            value={localizedDetails}
                            labels={detailsLabels}
                            action={saveItemDetailsAction}
                          />
                        </div>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">{d.noItems}</p>
              )}
              <AddItemForm
                categoryId={category.id}
                action={addItemAction}
                labels={itemLabels}
              />
            </div>
          );
        })}
      </div>

      <div className="rounded-xl border border-dashed p-4">
        <h2 className="mb-3 text-sm font-medium text-muted-foreground">
          {d.addCategory}
        </h2>
        <AddCategoryForm
          gameId={game.id}
          action={addCategoryAction}
          labels={{
            placeholder: d.categoryPlaceholder,
            add: d.addCategory,
            adding: d.adding,
          }}
        />
      </div>

      {/* Trophies are a separate system from the checklist above — own table,
          own progress, listed here only because they share this edit page. */}
      <div className="flex flex-col gap-3 rounded-xl border bg-card p-4">
        <h2 className="font-heading text-base font-semibold">
          {td.edit.sectionTitle}
        </h2>
        {trophies && trophies.length > 0 ? (
          <ul className="flex flex-col gap-1.5 text-sm">
            {trophies.map((trophy) => (
              <li key={trophy.id} className="flex items-start gap-2 text-muted-foreground">
                <span className="mt-1.5 size-1 shrink-0 rounded-full bg-muted-foreground/50" />
                <span>
                  <span className="text-foreground">
                    {pick(trophy.title_i18n, locale, trophy.title)}
                  </span>{" "}
                  <span className="text-xs">
                    ({td.tiers[trophy.tier as keyof typeof td.tiers] ?? trophy.tier})
                  </span>
                  {trophy.description
                    ? ` — ${pick(trophy.description_i18n, locale, trophy.description)}`
                    : ""}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">{td.empty}</p>
        )}
      </div>

      <div className="rounded-xl border border-dashed p-4">
        <h2 className="mb-3 text-sm font-medium text-muted-foreground">
          {td.edit.sectionTitle}
        </h2>
        <AddTrophyForm
          gameId={game.id}
          action={addTrophyAction}
          labels={{
            titlePlaceholder: td.edit.titlePlaceholder,
            descPlaceholder: td.edit.descPlaceholder,
            tierLabel: td.edit.tierLabel,
            tiers: td.tiers,
            add: td.edit.add,
            adding: td.edit.adding,
          }}
        />
      </div>
    </PageContainer>
  );
}
