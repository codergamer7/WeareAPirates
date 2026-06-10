"use client";

import { useEffect, useState } from "react";
import { Film, Tv } from "lucide-react";
import type { TmdbItem } from "@/lib/types";
import type { MediaType } from "@/lib/config";
import { GENRES } from "@/lib/config";
import { getByGenre, getPopular, getTopRated, getTrending } from "@/lib/tmdb";
import { MediaRow } from "@/components/media/MediaRow";
import { RowSkeleton } from "@/components/ui/Skeleton";

const GENRE_IDS = [28, 12, 16, 35, 80, 18, 14, 27, 9648, 878, 53, 10749];

export function BrowseClient({ type: kind }: { type: MediaType }) {
  const [rows, setRows] = useState<{ title: string; items: TmdbItem[] }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let on = true;
    setLoading(true);
    setRows([]);
    (async () => {
      const [trend, pop, top] = await Promise.all([
        getTrending(kind),
        getPopular(kind),
        getTopRated(kind),
      ]);
      if (!on) return;
      setRows([
        { title: "Trending", items: trend.results },
        { title: kind === "tv" ? "Popular Series" : "Popular Films", items: pop.results },
        { title: "Top Rated", items: top.results },
      ]);
      setLoading(false);
      const genreRows = await Promise.all(
        GENRE_IDS.filter((g) => GENRES[g]).map(async (g) => ({
          title: GENRES[g],
          items: (await getByGenre(kind, g)).results,
        })),
      );
      if (on) setRows((prev) => [...prev, ...genreRows.filter((r) => r.items.length)]);
    })();
    return () => {
      on = false;
    };
  }, [kind]);

  return (
    <div className="min-h-screen pb-20 pt-24">
      <div className="mx-auto max-w-[1500px] px-4 sm:px-8">
        <div className="mb-6 flex items-center gap-3">
          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-accent/10 text-accent ring-1 ring-accent/30">
            {kind === "tv" ? <Tv className="h-6 w-6" /> : <Film className="h-6 w-6" />}
          </span>
          <div>
            <h1 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
              {kind === "tv" ? "Series" : "Films"}
            </h1>
            <p className="text-sm text-muted">Browse the full collection</p>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="space-y-8">
          <RowSkeleton />
          <RowSkeleton />
          <RowSkeleton />
        </div>
      ) : (
        rows.map((r) => <MediaRow key={r.title} title={r.title} items={r.items} />)
      )}
    </div>
  );
}
