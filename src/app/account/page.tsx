import { getSession } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ProfileForm } from "@/components/profile-form";
import { DeleteAccountForm } from "@/components/delete-account-form";
import { PageContainer } from "@/components/page-container";
import { getLocale } from "@/i18n/get-locale";
import { getDictionary } from "@/i18n/get-dictionary";
import { updateProfileAction, deleteAccountAction } from "./actions";

export default async function AccountPage() {
  const supabase = await createClient();
  const claims = await getSession();
  if (!claims) redirect("/login");

  const dict = getDictionary(await getLocale());
  const d = dict.account;

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, avatar_url")
    .eq("id", claims.sub)
    .maybeSingle();

  const name = profile?.display_name || claims.email || d.title;
  const initial = name.trim().charAt(0).toUpperCase() || "?";

  return (
    <PageContainer>
      <div className="flex items-center gap-3">
        <div className="flex size-12 items-center justify-center overflow-hidden rounded-full bg-primary/15 text-lg font-semibold text-primary ring-1 ring-border">
          {profile?.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={profile.avatar_url}
              alt=""
              className="size-full object-cover"
            />
          ) : (
            initial
          )}
        </div>
        <div className="min-w-0">
          <h1 className="font-heading text-xl font-semibold tracking-tight">
            {d.title}
          </h1>
          <p className="truncate text-sm text-muted-foreground">
            {claims.email}
          </p>
        </div>
      </div>

      <div className="rounded-xl border bg-card p-5">
        <h2 className="mb-4 text-sm font-medium text-muted-foreground">
          {d.profile}
        </h2>
        <ProfileForm
          action={updateProfileAction}
          defaultDisplayName={profile?.display_name ?? ""}
          defaultAvatarUrl={profile?.avatar_url ?? ""}
          labels={{
            displayName: d.displayName,
            avatarUrl: d.avatarUrl,
            save: d.save,
            saving: d.saving,
          }}
        />
      </div>

      <div className="rounded-xl border border-destructive/30 bg-destructive/[0.03] p-5">
        <h2 className="mb-1 text-sm font-medium text-destructive">
          {d.dangerZone}
        </h2>
        <p className="mb-4 text-sm text-muted-foreground">{d.dangerBody}</p>
        <DeleteAccountForm
          action={deleteAccountAction}
          labels={{
            delete: d.deleteAccount,
            deleting: d.deleting,
            confirm: d.deleteConfirm,
          }}
        />
      </div>
    </PageContainer>
  );
}
