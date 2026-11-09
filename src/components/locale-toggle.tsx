"use client";

import Image from "next/image";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { LOCALE_COOKIE, type Locale } from "@/i18n/config";
import { cn } from "@/lib/utils";

// Flags from Nucleo's free SVG flag set (https://nucleoapp.com/svg-flag-icons),
// stored in public/flags. Language names stay in their own language so a
// reader can always find theirs.
const LOCALES: Record<Locale, { flag: string; name: string }> = {
  en: { flag: "/flags/us.svg", name: "English" },
  pt: { flag: "/flags/br.svg", name: "Português" },
};

export function LocaleToggle({ locale, label }: { locale: Locale; label: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const next: Locale = locale === "en" ? "pt" : "en";
  const current = LOCALES[locale];

  function switchLocale() {
    document.cookie = `${LOCALE_COOKIE}=${next}; path=/; max-age=31536000; samesite=lax`;
    startTransition(() => router.refresh());
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={switchLocale}
      disabled={isPending}
      aria-label={`${label}: ${current.name} → ${LOCALES[next].name}`}
      title={`${label}: ${current.name}`}
      className="gap-1.5"
    >
      <Image
        src={current.flag}
        alt=""
        width={20}
        height={20}
        unoptimized
        className={cn("size-5 transition-opacity", isPending && "opacity-50")}
      />
      <span className="text-xs font-semibold tabular-nums">{locale.toUpperCase()}</span>
    </Button>
  );
}
