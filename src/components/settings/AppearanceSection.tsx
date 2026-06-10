"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Check, Search } from "lucide-react";
import { useTheme } from "@/lib/theme-context";
import { THEME_CATEGORIES, type ThemeDef } from "@/lib/themes";
import { cn } from "@/lib/utils";

const TABS = ["All", ...THEME_CATEGORIES] as const;

export function AppearanceSection() {
  const { themeId, setTheme, themes } = useTheme();
  const [tab, setTab] = useState<(typeof TABS)[number]>("All");
  const [q, setQ] = useState("");

  const shown = useMemo(() => {
    const query = q.trim().toLowerCase();
    return themes.filter(
      (t) =>
        (tab === "All" || t.category === tab) &&
        (!query || t.name.toLowerCase().includes(query)),
    );
  }, [themes, tab, q]);

  return (
    <div>
      <SectionHeader title="Appearance" subtitle="Customize how Calypso looks." />

      {/* category tabs */}
      <div className="mt-6 flex flex-wrap gap-1.5">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              "relative rounded-full px-4 py-1.5 text-sm font-medium transition-colors",
              tab === t ? "text-accent-foreground" : "text-muted hover:text-foreground",
            )}
          >
            {tab === t && (
              <motion.span
                layoutId="theme-tab"
                className="absolute inset-0 -z-10 rounded-full bg-accent"
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
              />
            )}
            {t}
          </button>
        ))}
      </div>

      {/* search */}
      <div className="mt-4 flex items-center gap-2 rounded-xl border border-border bg-surface/50 px-3.5 py-2.5">
        <Search className="h-4 w-4 text-muted" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search themes…"
          className="w-full bg-transparent text-sm outline-none placeholder:text-muted/60"
        />
      </div>

      {/* grid */}
      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
        {shown.map((t) => (
          <ThemeCard
            key={t.id}
            theme={t}
            selected={t.id === themeId}
            onSelect={() => setTheme(t.id)}
          />
        ))}
      </div>
      {shown.length === 0 && (
        <p className="py-12 text-center text-sm text-muted">No themes match.</p>
      )}
    </div>
  );
}

function ThemeCard({
  theme,
  selected,
  onSelect,
}: {
  theme: ThemeDef;
  selected: boolean;
  onSelect: () => void;
}) {
  const v = theme.vars;
  return (
    <button
      onClick={onSelect}
      className={cn(
        "group overflow-hidden rounded-2xl border text-left transition-all",
        selected
          ? "border-accent ring-2 ring-accent/60"
          : "border-border hover:border-accent/50",
      )}
    >
      {/* mini window preview, painted with the theme's own variables */}
      <div className="flex gap-2 p-3" style={{ background: v["--background"] }}>
        <div
          className="h-14 w-9 shrink-0 rounded-lg"
          style={{ background: v["--surface"] }}
        />
        <div className="flex flex-1 flex-col justify-center gap-1.5">
          <div className="h-2 w-3/4 rounded-full" style={{ background: theme.accent }} />
          <div className="h-2 w-full rounded-full" style={{ background: v["--surface-2"] }} />
          <div className="h-2 w-2/3 rounded-full" style={{ background: v["--surface-2"] }} />
        </div>
      </div>
      <div
        className={cn(
          "flex items-center justify-between px-3 py-2.5",
          selected ? "bg-accent/10" : "bg-surface/40",
        )}
      >
        <span className={cn("text-sm font-semibold", selected && "text-accent")}>
          {theme.name}
        </span>
        {selected && <Check className="h-4 w-4 text-accent" />}
      </div>
    </button>
  );
}

export function SectionHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">
          {title}
        </h1>
        <p className="mt-1 text-sm text-muted">{subtitle}</p>
      </div>
      {action}
    </div>
  );
}
