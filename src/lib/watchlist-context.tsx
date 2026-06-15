"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import type { MediaType } from "@/lib/config";
import { useAuth } from "@/lib/auth-context";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { getList, toggleList, type ListItemInput } from "@/lib/lists";

const keyOf = (media_type: MediaType, tmdb_id: number) => `${media_type}:${tmdb_id}`;

interface WatchlistCtx {
  ready: boolean;
  isSaved: (media_type: MediaType, tmdb_id: number) => boolean;
  toggle: (item: ListItemInput) => Promise<boolean>;
}

const Ctx = createContext<WatchlistCtx | null>(null);

// Loads the signed-in user's watchlist membership ONCE and shares it, so every
// card shows the correct saved state without an N+1 query per card — and a click
// on an already-saved card removes it instead of silently re-toggling blind.
export function WatchlistProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [ids, setIds] = useState<Set<string>>(new Set());
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let on = true;
    setReady(false);
    if (!user) {
      setIds(new Set());
      return;
    }
    const sb = createSupabaseBrowserClient();
    if (!sb) return;
    getList(sb, user.id, "watchlist").then((rows) => {
      if (!on) return;
      setIds(new Set(rows.map((r) => keyOf(r.media_type, r.tmdb_id))));
      setReady(true);
    });
    return () => {
      on = false;
    };
  }, [user]);

  const isSaved = useCallback(
    (media_type: MediaType, tmdb_id: number) => ids.has(keyOf(media_type, tmdb_id)),
    [ids],
  );

  const toggle = useCallback(
    async (item: ListItemInput) => {
      if (!user) return false;
      const sb = createSupabaseBrowserClient();
      if (!sb) return false;
      const now = await toggleList(sb, user.id, item, "watchlist");
      setIds((prev) => {
        const next = new Set(prev);
        const k = keyOf(item.media_type, item.tmdb_id);
        if (now) next.add(k);
        else next.delete(k);
        return next;
      });
      return now;
    },
    [user],
  );

  return <Ctx.Provider value={{ ready, isSaved, toggle }}>{children}</Ctx.Provider>;
}

export function useWatchlist() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useWatchlist must be used within WatchlistProvider");
  return ctx;
}
