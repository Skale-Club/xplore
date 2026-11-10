import Image from "next/image";
import Link from "next/link";
import { LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { signOutAction } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { HeaderNav } from "@/components/header-nav";
import { ThemeToggle } from "@/components/theme-toggle";
import { LocaleToggle } from "@/components/locale-toggle";
import { getLocale } from "@/i18n/get-locale";
import { getDictionary } from "@/i18n/get-dictionary";
import { NavigationPending } from "@/components/navigation-pending";

export async function SiteHeader() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;

  if (!claims) return null;

  const locale = await getLocale();
  const dict = getDictionary(locale);

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, avatar_url")
    .eq("id", claims.sub)
    .maybeSingle();

  const name = profile?.display_name || claims.email || dict.nav.account;
  const initial = name.trim().charAt(0).toUpperCase() || "?";

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-14 w-full max-w-5xl items-center justify-between gap-2 px-4">
        <div className="flex min-w-0 items-center gap-2 sm:gap-4">
          <Link
            href="/dashboard"
            className="relative flex shrink-0 items-center gap-2 font-heading text-lg font-semibold tracking-tight"
          >
            <Image
              src="/icon-512.png"
              alt="Xplore"
              width={30}
              height={30}
              priority
            />
            {/* Logo only on phones: the wordmark collided with the nav icons. */}
            <span className="hidden sm:inline">Xplore</span>
            <NavigationPending label={dict.common.loading} className="absolute -right-1 -top-1 sm:static" />
          </Link>
          <HeaderNav labels={dict.nav} loadingLabel={dict.common.loading} />
        </div>

        <div className="flex items-center gap-1">
          <LocaleToggle locale={locale} label={dict.common.language} />
          <ThemeToggle label={dict.common.toggleTheme} />
          <Link
            href="/account"
            title={name}
            aria-label={dict.nav.account}
            className="relative flex size-8 items-center justify-center overflow-hidden rounded-full bg-primary/15 text-sm font-semibold text-primary ring-1 ring-border transition-transform hover:scale-105"
          >
            {profile?.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={profile.avatar_url}
                alt={name}
                className="size-full object-cover"
              />
            ) : (
              initial
            )}
            <NavigationPending label={dict.common.loading} className="absolute bottom-0 right-0" />
          </Link>
          <form action={signOutAction}>
            <Button
              type="submit"
              variant="ghost"
              size="icon-sm"
              aria-label={dict.common.signOut}
              title={dict.common.signOut}
            >
              <LogOut />
            </Button>
          </form>
        </div>
      </div>
    </header>
  );
}
