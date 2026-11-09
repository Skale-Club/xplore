"use client";

import Image from "next/image";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Menu } from "@base-ui/react/menu";
import { Check, ChevronDown } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { LOCALE_COOKIE, isLocale, locales, type Locale } from "@/i18n/config";
import { cn } from "@/lib/utils";

// Flags from Nucleo's free SVG flag set (https://nucleoapp.com/svg-flag-icons),
// stored in public/flags. Language names stay in their own language so a
// reader can always find theirs.
const LOCALES: Record<Locale, { flag: string; name: string }> = {
  en: { flag: "/flags/us.svg", name: "English" },
  pt: { flag: "/flags/br.svg", name: "Português" },
};

/** Language picker: the flag opens a menu; nothing changes until you choose. */
export function LocaleToggle({ locale, label }: { locale: Locale; label: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const current = LOCALES[locale];

  function choose(value: unknown) {
    if (!isLocale(value as string) || value === locale) return;
    document.cookie = `${LOCALE_COOKIE}=${value}; path=/; max-age=31536000; samesite=lax`;
    startTransition(() => router.refresh());
  }

  return (
    <Menu.Root>
      <Menu.Trigger
        aria-label={`${label}: ${current.name}`}
        title={label}
        disabled={isPending}
        className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "gap-1.5")}
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
        <ChevronDown className="size-3.5 text-muted-foreground" aria-hidden />
      </Menu.Trigger>

      <Menu.Portal>
        <Menu.Positioner sideOffset={6} align="end" className="z-50 outline-none">
          <Menu.Popup className="min-w-48 origin-[var(--transform-origin)] rounded-xl border bg-popover p-1 text-popover-foreground shadow-lg outline-none transition-[opacity,scale] data-[ending-style]:scale-95 data-[ending-style]:opacity-0 data-[starting-style]:scale-95 data-[starting-style]:opacity-0">
            <Menu.Group>
              <Menu.GroupLabel className="px-2.5 pt-1.5 pb-1 text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
                {label}
              </Menu.GroupLabel>
              <Menu.RadioGroup value={locale} onValueChange={choose}>
                {locales.map((code) => (
                  <Menu.RadioItem
                    key={code}
                    value={code}
                    lang={code}
                    closeOnClick
                    className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm outline-none select-none data-[highlighted]:bg-muted data-[checked]:font-medium"
                  >
                    <Image
                      src={LOCALES[code].flag}
                      alt=""
                      width={20}
                      height={20}
                      unoptimized
                      className="size-5"
                    />
                    <span className="flex-1">{LOCALES[code].name}</span>
                    <Menu.RadioItemIndicator className="text-primary">
                      <Check className="size-4" aria-hidden />
                    </Menu.RadioItemIndicator>
                  </Menu.RadioItem>
                ))}
              </Menu.RadioGroup>
            </Menu.Group>
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  );
}
