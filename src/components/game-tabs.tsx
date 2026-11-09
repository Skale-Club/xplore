"use client";

import { createContext, useContext, useState } from "react";
import { cn } from "@/lib/utils";

type TabValue = "detonado" | "trophies";

const GameTabsContext = createContext<{
  tab: TabValue;
  setTab: (tab: TabValue) => void;
} | null>(null);

function useGameTabs() {
  const value = useContext(GameTabsContext);
  if (!value) throw new Error("GameTabs components need <GameTabs>");
  return value;
}

/**
 * Walkthrough / Trophies tabs. The switch is rendered inside each panel's own
 * toolbar (same line as its search on wider screens), so this holds the state
 * instead of a single tab bar above the panels.
 */
export function GameTabs({ children }: { children: React.ReactNode }) {
  const [tab, setTab] = useState<TabValue>("detonado");
  return <GameTabsContext.Provider value={{ tab, setTab }}>{children}</GameTabsContext.Provider>;
}

/** Hidden (not unmounted) when inactive, so each tab keeps its search/filters. */
export function GameTabPanel({ value, children }: { value: TabValue; children: React.ReactNode }) {
  const { tab } = useGameTabs();
  return (
    <div
      role="tabpanel"
      id={`game-tab-panel-${value}`}
      aria-labelledby={`game-tab-${value}`}
      hidden={tab !== value}
      className="text-base"
    >
      {children}
    </div>
  );
}

const ORDER: TabValue[] = ["detonado", "trophies"];

export function GameTabSwitch({
  labels,
  className,
}: {
  labels: Record<TabValue, string>;
  className?: string;
}) {
  const { tab, setTab } = useGameTabs();

  return (
    <div
      role="tablist"
      className={cn("inline-flex h-11 shrink-0 items-center rounded-xl bg-muted p-1", className)}
      onKeyDown={(event) => {
        if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
        event.preventDefault();
        event.stopPropagation(); // don't also switch walkthrough chapters
        const next = ORDER[(ORDER.indexOf(tab) + (event.key === "ArrowRight" ? 1 : -1) + ORDER.length) % ORDER.length];
        setTab(next);
        document.getElementById(`game-tab-${next}`)?.focus();
      }}
    >
      {ORDER.map((value) => {
        const active = tab === value;
        return (
          <button
            key={value}
            id={`game-tab-${value}`}
            type="button"
            role="tab"
            aria-selected={active}
            aria-controls={`game-tab-panel-${value}`}
            tabIndex={active ? 0 : -1}
            onClick={() => setTab(value)}
            className={cn(
              "h-full flex-1 rounded-lg px-4 text-[15px] font-medium whitespace-nowrap outline-none transition-colors focus-visible:ring-3 focus-visible:ring-ring/40",
              active
                ? "bg-background text-foreground shadow-sm dark:bg-input/40"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {labels[value]}
          </button>
        );
      })}
    </div>
  );
}
