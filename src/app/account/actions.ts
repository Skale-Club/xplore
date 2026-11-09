"use server";

import { destroySession, getSession } from "@/lib/auth/session";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getLocale } from "@/i18n/get-locale";
import { getDictionary } from "@/i18n/get-dictionary";

export type ProfileState = { error: string | null; message?: string | null };

export async function updateProfileAction(
  _prevState: ProfileState,
  formData: FormData
): Promise<ProfileState> {
  const displayName = ((formData.get("display_name") as string) ?? "").trim();
  const avatarUrl = ((formData.get("avatar_url") as string) ?? "").trim();

  const supabase = await createClient();
  const claims = await getSession();
  const userId = claims?.sub;
  if (!userId) redirect("/login");

  const { error } = await supabase.from("profiles").upsert(
    {
      id: userId,
      display_name: displayName || null,
      avatar_url: avatarUrl || null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "id" }
  );

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/account");
  revalidatePath("/dashboard");
  return {
    error: null,
    message: getDictionary(await getLocale()).account.saved,
  };
}

export type DeleteAccountState = { error: string | null };

export async function deleteAccountAction(
  _prevState: DeleteAccountState,
  _formData: FormData
): Promise<DeleteAccountState> {
  const claims = await getSession();
  const userId = claims?.sub;
  if (!userId) redirect("/login");

  const admin = createAdminClient();
  const { error } = await admin.rpc("delete_app_account", { p_user_id: userId });

  if (error) {
    return { error: error.message };
  }

  await destroySession();
  redirect("/login");
}
