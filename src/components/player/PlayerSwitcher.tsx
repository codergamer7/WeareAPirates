"use client";

import { motion } from "framer-motion";
import { MonitorPlay, RefreshCw, RotateCcw } from "lucide-react";
import {
  PLAYER_PROVIDER_LABELS,
  PLAYER_PROVIDERS,
} from "@/lib/player-provider";
import { usePlayerPreference } from "@/lib/player-context";
import { cn } from "@/lib/utils";

// Per-user video source switcher shown under the player. Each viewer's choice
// is saved to their own browser only — it never changes anyone else's player.
export function PlayerSwitcher({ layoutId = "user-player-provider" }: { layoutId?: string }) {
  const { provider, setProvider, hasOverride, resetToDefault, reloadPlayer } =
    usePlayerPreference();

  return (
    <div className="mt-3 flex flex-col gap-2.5 rounded-xl border border-border bg-surface/40 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-2 text-sm text-muted">
        <MonitorPlay className="h-4 w-4 shrink-0 text-accent" />
        <span>
          <span className="font-semibold text-foreground">Any errors?</span> Reload or
          switch the video player.
        </span>
      </div>

      <div className="flex items-center gap-1.5">
        <button
          onClick={reloadPlayer}
          title="Reload the player"
          className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-semibold text-muted transition-colors hover:border-accent/50 hover:text-foreground"
        >
          <RefreshCw className="h-3.5 w-3.5" /> Reload
        </button>
        <div className="flex gap-1 rounded-full border border-border bg-surface-2/50 p-1">
          {PLAYER_PROVIDERS.map((p) => (
            <button
              key={p}
              onClick={() => setProvider(p)}
              className={cn(
                "relative rounded-full px-3 py-1.5 text-xs font-semibold transition-colors",
                provider === p
                  ? "text-accent-foreground"
                  : "text-muted hover:text-foreground",
              )}
            >
              {provider === p && (
                <motion.span
                  layoutId={layoutId}
                  className="absolute inset-0 -z-10 rounded-full bg-accent"
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              )}
              {PLAYER_PROVIDER_LABELS[p]}
            </button>
          ))}
        </div>
        {hasOverride && (
          <button
            onClick={resetToDefault}
            title="Reset to the default player"
            className="grid h-8 w-8 place-items-center rounded-full text-muted transition-colors hover:bg-foreground/10 hover:text-foreground"
          >
            <RotateCcw className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}
