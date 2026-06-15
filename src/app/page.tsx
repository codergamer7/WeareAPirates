"use client";

import { useEffect, useState } from "react";
import type { Reminder, TmdbItem, WatchProgress } from "@/lib/types";
import {
  getByGenre,
  getNewReleases,
  getPopular,
  getRecommendations,
  getTopRated,
  getTrending,
} from "@/lib/tmdb";
import { HOME_GENRES } from "@/lib/config";
import { useAuth } from "@/lib/auth-context";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { getReminders, getWatchHistory } from "@/lib/lists";
import { buildRecommendations } from "@/lib/recommend";
import { Hero } from "@/components/home/Hero";
import { MediaRow } from "@/components/media/MediaRow";
import { Top10Row } from "@/components/home/Top10Row";
import { RemindersRow } from "@/components/home/RemindersRow";
import { ContinueWatchingRow } from "@/components/home/ContinueWatchingRow";
import { RowSkeleton, Skeleton } from "@/components/ui/Skeleton";

interface Row {
  title: string;
  items: TmdbItem[];
}

export default function HomePage() {
  const { user } = useAuth();
  const [hero, setHero] = useState<TmdbItem[]>([]);
  const [rows, setRows] = useState<Row[]>([]);
  const [top10, setTop10] = useState<TmdbItem[]>([]);
  const [newReleases, setNewReleases] = useState<TmdbItem[]>([]);
  const [continueW, setContinueW] = useState<WatchProgress[]>([]);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [recRow, setRecRow] = useState<Row | null>(null);
  const [forYou, setForYou] = useState<TmdbItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const [trending, popMovies, popTv, topMovies, topTv] = await Promise.all([
          getTrending("all"),
          getPopular("movie"),
          getPopular("tv"),
          getTopRated("movie"),
          getTopRated("tv"),
        ]);
        if (!active) return;
        const trendingItems = trending.results.filter((r) => r.media_type !== "person");
        setHero(trendingItems);
        setTop10(trendingItems);
        const base: Row[] = [
          { title: "Trending This Week", items: trendingItems },
          { title: "Popular Films", items: popMovies.results },
          { title: "Popular Series", items: popTv.results },
          { title: "Top Rated Films", items: topMovies.results },
          { title: "Top Rated Series", items: topTv.results },
        ];
        setRows(base);
        setLoading(false);

        // new this week (lazy)
        getNewReleases().then((items) => {
          if (active) setNewReleases(items);
        });

        // genre rows (lazy, appended)
        const genreRows = await Promise.all(
          HOME_GENRES.map(async (g) => ({
            title: g.label,
            items: (await getByGenre("movie", g.id)).results,
          })),
        );
        if (active) setRows((prev) => [...prev, ...genreRows]);
      } catch {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  // personalized: continue watching + advanced recommendations from all history
  useEffect(() => {
    if (!user) return;
    const sb = createSupabaseBrowserClient();
    if (!sb) return;
    let active = true;
    (async () => {
      getReminders(sb, user.id).then((rs) => {
        if (active) setReminders(rs);
      });

      const history = await getWatchHistory(sb, user.id);
      if (!active) return;
      setContinueW(
        history.filter((h) => !h.completed && h.progress_percent > 1).slice(0, 20),
      );
      if (!history.length) return;

      // "Recommended For You" — taste-profiled across everything watched
      buildRecommendations(
        history.map((h) => ({
          media_type: h.media_type,
          tmdb_id: h.tmdb_id,
          progress_percent: h.progress_percent,
          updated_at: h.updated_at,
        })),
      ).then((recs) => {
        if (active && recs.length) setForYou(recs);
      });

      // a familiar "Because you watched X" from your latest title
      const recent = history[0];
      const recentTitle = recent.title?.trim();
      try {
        const r = await getRecommendations(recent.media_type, recent.tmdb_id);
        if (active && r.results.length)
          setRecRow({
            title: recentTitle ? `Because you watched ${recentTitle}` : "More to watch",
            items: r.results,
          });
      } catch {}
    })();
    return () => {
      active = false;
    };
  }, [user]);

  return (
    <div className="pb-20">
      {loading ? (
        <div className="relative h-[88vh] min-h-[560px]">
          <Skeleton className="h-full w-full rounded-none" />
        </div>
      ) : (
        <Hero items={hero} />
      )}

      <div className="relative z-10 -mt-8 space-y-2">
        {user && continueW.length > 0 && (
          <ContinueWatchingRow items={continueW} onChange={setContinueW} />
        )}
        {user && reminders.length > 0 && (
          <RemindersRow items={reminders} onChange={setReminders} />
        )}
        {forYou.length > 0 && (
          <MediaRow title="Recommended For You" items={forYou} />
        )}
        {recRow && <MediaRow title={recRow.title} items={recRow.items} />}

        {top10.length > 0 && <Top10Row title="Top 10 This Week" items={top10} />}
        {newReleases.length > 0 && (
          <MediaRow title="New This Week" items={newReleases} />
        )}

        {loading ? (
          <div className="space-y-8 pt-8">
            <RowSkeleton />
            <RowSkeleton />
            <RowSkeleton />
          </div>
        ) : (
          rows.map((r) => <MediaRow key={r.title} title={r.title} items={r.items} />)
        )}
      </div>
    </div>
  );
}
