"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutGrid, Gamepad2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { NavigationPending } from "@/components/navigation-pending";

export function HeaderNav({
  labels,
  loadingLabel,
}: {
  labels: { dashboard: string; games: string };
  loadingLabel: string;
}) {
  const pathname = usePathname();

  const links = [
    { href: "/dashboard", label: labels.dashboard, icon: LayoutGrid },
    { href: "/games", label: labels.games, icon: Gamepad2 },
  ];

  return (
    <nav className="flex items-center gap-1">
      {links.map(({ href, label, icon: Icon }) => {
        const active = pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link
            key={href}
            href={href}
            aria-label={label}
            aria-current={active ? "page" : undefined}
            className={cn(
              "relative flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-medium transition-colors",
              active
                ? "bg-accent text-accent-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            <Icon className="size-4" />
            <span className="hidden sm:inline">{label}</span>
            <NavigationPending label={loadingLabel} className="absolute right-0.5 top-0.5 sm:static" />
          </Link>
        );
      })}
    </nav>
  );
}
