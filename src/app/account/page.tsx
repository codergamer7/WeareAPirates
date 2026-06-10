"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { Bookmark, Clock, Heart, ListVideo, Shield } from "lucide-react";
import type { MediaType } from "@/lib/config";
import type { TmdbItem, UserListItem, WatchProgress } from "@/lib/types";
import { useAuth } from "@/lib/auth-context";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { getContinueWatching, getList } from "@/lib/lists";
import { MediaCard } from "@/components/media/MediaCard";
import { ContinueWatchingRow } from "@/components/home/ContinueWatchingRow";
import { prettyDate } from "@/lib/utils";

type Tab = "continue" | "watchlist" | "saved" | "favorite";

function toItem(x: UserListItem): TmdbItem {
  return {
    id: x.tmdb_id,
    media_type: x.media_type,
    poster_path: x.poster_path,
    backdrop_path: null,
    overview: "",
    vote_average: 0,
    ...(x.media_type === "tv" ? { name: x.title ?? "" } : { title: x.title ?? "" }),
  };
}

const TABS: { key: Tab; label: string; icon: React.ReactNode }[] = [
  { key: "continue", label: "Continue Watching", icon: <Clock className="h-4 w-4" /> },
  { key: "watchlist", label: "Watchlist", icon: <ListVideo className="h-4 w-4" /> },
  { key: "saved", label: "Saved", icon: <Bookmark className="h-4 w-4" /> },
  { key: "favorite", label: "Favorites", icon: <Heart className="h-4 w-4" /> },
];

export default function AccountPage() {
  const { user, profile, isAdmin } = useAuth();
  const [tab, setTab] = useState<Tab>("continue");
  const [cw, setCw] = useState<WatchProgress[]>([]);
  const [lists, setLists] = useState<Record<string, UserListItem[]>>({
    watchlist: [],
    saved: [],
    favorite: [],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const sb = createSupabaseBrowserClient();
    if (!sb) return;
    let on = true;
    (async () => {
      const [c, w, s, f] = await Promise.all([
        getContinueWatching(sb, user.id),
        getList(sb, user.id, "watchlist"),
        getList(sb, user.id, "saved"),
        getList(sb, user.id, "favorite"),
      ]);
      if (!on) return;
      setCw(c);
      setLists({ watchlist: w, saved: s, favorite: f });
      setLoading(false);
    })();
    return () => {
      on = false;
    };
  }, [user]);

  const counts: Record<Tab, number> = {
    continue: cw.length,
    watchlist: lists.watchlist.length,
    saved: lists.saved.length,
    favorite: lists.favorite.length,
  };

  const initial = (profile?.display_name || profile?.email || "?").charAt(0).toUpperCase();

  return (
    <div className="min-h-screen pb-20 pt-24">
      <div className="mx-auto max-w-[1500px] px-4 sm:px-8">
        {/* profile header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-start gap-5 rounded-3xl border border-border bg-surface/40 p-6 sm:flex-row sm:items-center"
        >
          <div className="grid h-20 w-20 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-accent-bright to-accent text-3xl font-bold text-accent-foreground shadow-[0_8px_24px_var(--glow)]">
            {initial}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h1 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">
                {profile?.display_name || "Crew member"}
              </h1>
              {isAdmin && (
                <span className="flex items-center gap-1 rounded-full bg-accent/15 px-2.5 py-0.5 text-xs font-semibold text-accent">
                  <Shield className="h-3 w-3" /> Admin
                </span>
              )}
            </div>
            <p className="text-sm text-muted">{profile?.email}</p>
            {profile?.created_at && (
              <p className="mt-1 text-xs text-muted">
                Aboard since {prettyDate(profile.created_at)}
              </p>
            )}
          </div>
          {isAdmin && (
            <Link
              href="/admin"
              className="inline-flex items-center gap-2 rounded-full bg-accent px-5 py-2.5 text-sm font-bold text-accent-foreground transition-transform hover:scale-105"
            >
              <Shield className="h-4 w-4" /> Control Panel
            </Link>
          )}
        </motion.div>

        {/* tabs */}
        <div className="mt-8 flex gap-1.5 overflow-x-auto border-b border-border pb-px">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`relative flex items-center gap-2 whitespace-nowrap px-4 py-3 text-sm font-medium transition-colors ${
                tab === t.key ? "text-accent" : "text-muted hover:text-foreground"
              }`}
            >
              {t.icon}
              {t.label}
              <span className="rounded-full bg-foreground/10 px-1.5 text-xs">
                {counts[t.key]}
              </span>
              {tab === t.key && (
                <motion.span
                  layoutId="account-tab"
                  className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-accent"
                />
              )}
            </button>
          ))}
        </div>

        {/* content */}
        <div className="mt-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={tab}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25 }}
            >
              {loading ? (
                <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="shimmer aspect-[2/3] rounded-xl" />
                  ))}
                </div>
              ) : tab === "continue" ? (
                cw.length ? (
                  <div className="-mx-4 sm:-mx-8">
                    <ContinueWatchingRow items={cw} onChange={setCw} />
                  </div>
                ) : (
                  <Empty label="Nothing in progress yet — press play on something." />
                )
              ) : lists[tab].length ? (
                <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-7">
                  {lists[tab].map((it, i) => (
                    <MediaCard key={it.id} item={toItem(it)} index={i} />
                  ))}
                </div>
              ) : (
                <Empty
                  label={
                    tab === "watchlist"
                      ? "Your watchlist is empty."
                      : tab === "saved"
                        ? "Nothing saved for later yet."
                        : "No favorites yet."
                  }
                />
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

function Empty({ label }: { label: string }) {
  return (
    <div className="grid place-items-center rounded-3xl border border-dashed border-border py-20 text-center">
      <p className="text-muted">{label}</p>
      <Link
        href="/"
        className="mt-4 rounded-full bg-accent px-5 py-2.5 text-sm font-bold text-accent-foreground"
      >
        Explore titles
      </Link>
    </div>
  );
}
