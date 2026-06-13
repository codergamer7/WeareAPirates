"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import {
  DEFAULT_PLAYER_PROVIDER,
  isPlayerProvider,
  type PlayerProvider,
} from "@/lib/player-provider";

const STORAGE_KEY = "calypso.player_provider";

interface PlayerCtx {
  provider: PlayerProvider;
  setProvider: (p: PlayerProvider) => void;
  // true once a personal choice or the admin default has resolved
  hasOverride: boolean;
  resetToDefault: () => void;
}

const Ctx = createContext<PlayerCtx | null>(null);

// Per-user (browser-local) video player preference. Defaults to the admin's
// global choice, but each viewer can switch it for themselves — their pick is
// saved to localStorage and never affects anyone else.
export function PlayerPreferenceProvider({ children }: { children: React.ReactNode }) {
  const [provider, setProviderState] = useState<PlayerProvider>(DEFAULT_PLAYER_PROVIDER);
  const [hasOverride, setHasOverride] = useState(false);

  // Fetch the admin's global default (used only when the user hasn't overridden).
  const loadGlobalDefault = useCallback(() => {
    fetch("/api/player-provider")
      .then((r) => r.json())
      .then((d) => {
        if (isPlayerProvider(d.provider)) setProviderState(d.provider);
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    let stored: string | null = null;
    try {
      stored = localStorage.getItem(STORAGE_KEY);
    } catch {
      // ignore
    }
    if (isPlayerProvider(stored)) {
      setProviderState(stored);
      setHasOverride(true);
    } else {
      loadGlobalDefault();
    }
  }, [loadGlobalDefault]);

  const setProvider = useCallback((p: PlayerProvider) => {
    setProviderState(p);
    setHasOverride(true);
    try {
      localStorage.setItem(STORAGE_KEY, p);
    } catch {
      // ignore
    }
  }, []);

  const resetToDefault = useCallback(() => {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
    setHasOverride(false);
    loadGlobalDefault();
  }, [loadGlobalDefault]);

  return (
    <Ctx.Provider value={{ provider, setProvider, hasOverride, resetToDefault }}>
      {children}
    </Ctx.Provider>
  );
}

export function usePlayerPreference() {
  const ctx = useContext(Ctx);
  if (!ctx)
    throw new Error("usePlayerPreference must be used within PlayerPreferenceProvider");
  return ctx;
}
