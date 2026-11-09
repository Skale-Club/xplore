"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function toggleItemCompletionAction(
  itemId: string,
  completed: boolean
) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  if (!userId) redirect("/login");

  const { error } = await supabase.from("user_item_progress").upsert(
    {
      user_id: userId,
      item_id: itemId,
      completed,
      completed_at: completed ? new Date().toISOString() : null,
    },
    { onConflict: "user_id,item_id" }
  );

  if (error) throw error;

  revalidatePath("/games/[slug]", "page");
  revalidatePath("/dashboard");
}

// Bulk version of the toggle above, used by "Mark all done" / "Clear chapter".
// One upsert for the whole set instead of one round trip per item. RLS on
// user_item_progress still pins every row to the caller's own user_id.
const MAX_BULK_ITEMS = 500;

export async function setItemsCompletionAction(
  itemIds: string[],
  completed: boolean
) {
  if (
    !Array.isArray(itemIds) ||
    itemIds.length === 0 ||
    itemIds.length > MAX_BULK_ITEMS ||
    itemIds.some((id) => typeof id !== "string") ||
    typeof completed !== "boolean"
  ) {
    throw new Error("Invalid request");
  }

  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  if (!userId) redirect("/login");

  const completedAt = completed ? new Date().toISOString() : null;
  const { error } = await supabase.from("user_item_progress").upsert(
    itemIds.map((itemId) => ({
      user_id: userId,
      item_id: itemId,
      completed,
      completed_at: completedAt,
    })),
    { onConflict: "user_id,item_id" }
  );

  if (error) throw error;

  revalidatePath("/games/[slug]", "page");
  revalidatePath("/dashboard");
}

// Trophies are a separate system from the checklist — own progress table,
// own upsert — so marking one never touches user_item_progress.
export async function toggleTrophyCompletionAction(
  trophyId: string,
  completed: boolean
) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  if (!userId) redirect("/login");

  const { error } = await supabase.from("user_trophy_progress").upsert(
    {
      user_id: userId,
      trophy_id: trophyId,
      completed,
      completed_at: completed ? new Date().toISOString() : null,
    },
    { onConflict: "user_id,trophy_id" }
  );

  if (error) throw error;

  revalidatePath("/games/[slug]", "page");
  revalidatePath("/dashboard");
}
