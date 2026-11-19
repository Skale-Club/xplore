"use client";

import { createContext, useContext, useId, useState } from "react";
import { cn } from "@/lib/utils";

export type TabValue = "detonado" | "trophies" | "guides";
const GameTabsContext = createContext<{ tab: TabValue; setTab: (tab: TabValue) => void; id: string } | null>(null);
const PanelContext = createContext<TabValue | null>(null);
/** Standalone fixtures and legacy consumers remain active without a provider. */
export function useGameTabActive(value: TabValue) {
  const context = useContext(GameTabsContext);
  return !context || context.tab === value;
}
function useGameTabs() {
  const value = useContext(GameTabsContext);
  if (!value) throw new Error("GameTabs components need <GameTabs>");
  return value;
}

/** Panels stay mounted so walkthrough and reference searches retain state. */
export function GameTabs({ children }: { children: React.ReactNode }) {
  const [tab, setTab] = useState<TabValue>("detonado");
  const id = useId();
  return <GameTabsContext.Provider value={{ tab, setTab, id }}>{children}</GameTabsContext.Provider>;
}

export function GameTabPanel({ value, children }: { value: TabValue; children: React.ReactNode }) {
  const { tab, id } = useGameTabs();
  return <PanelContext.Provider value={value}>
    <div role="tabpanel" id={`${id}-panel-${value}`} aria-labelledby={`${id}-tab-${value}`} hidden={tab !== value} className="text-base" onKeyDown={(event) => {
      // The hidden walkthrough's document shortcuts must not navigate chapters.
      if (value !== "detonado" && ["ArrowLeft", "ArrowRight", "/"].includes(event.key)) event.stopPropagation();
    }}>{children}</div>
  </PanelContext.Provider>;
}

const ORDER: TabValue[] = ["detonado", "trophies", "guides"];
export function GameTabSwitch({ labels, className }: {
  labels: { detonado: string; trophies?: string; guides?: string };
  className?: string;
}) {
  const { tab, setTab, id } = useGameTabs();
  const panel = useContext(PanelContext);
  const switchId = useId();
  const order = ORDER.filter((value) => !!labels[value]);
  return <div role="tablist" className={cn("inline-flex min-h-11 max-w-full flex-wrap items-stretch gap-1 rounded-xl bg-muted p-1", className)} onKeyDown={(event) => {
    if (!["ArrowRight", "ArrowLeft", "Home", "End"].includes(event.key)) return;
    event.preventDefault(); event.stopPropagation();
    const next = event.key === "Home" ? order[0] : event.key === "End" ? order[order.length - 1] : order[(order.indexOf(tab) + (event.key === "ArrowRight" ? 1 : -1) + order.length) % order.length];
    if (!next) return;
    setTab(next);
    requestAnimationFrame(() => document.getElementById(`${id}-tab-${next}`)?.focus());
  }}>
    {order.map((value) => {
      const active = tab === value;
      // Each mounted panel has a switch. Only the visible one owns ARIA IDs.
      const tabId = panel === null || panel === tab ? `${id}-tab-${value}` : `${switchId}-tab-${value}`;
      return <button key={value} id={tabId} type="button" role="tab" aria-selected={active} aria-controls={`${id}-panel-${value}`} tabIndex={active ? 0 : -1} onClick={() => setTab(value)} className={cn("min-h-11 min-w-0 flex-1 rounded-lg px-3 text-sm font-medium outline-none transition-colors focus-visible:ring-3 focus-visible:ring-ring/40 sm:text-[15px]", active ? "bg-background text-foreground shadow-sm dark:bg-input/40" : "text-muted-foreground hover:text-foreground")}>{labels[value]}</button>;
    })}
  </div>;
}
