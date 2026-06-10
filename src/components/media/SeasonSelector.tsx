"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { Calendar, ChevronDown, Play } from "lucide-react";
import { getSeason } from "@/lib/tmdb";
import { img } from "@/lib/config";
import { prettyDate } from "@/lib/utils";

interface Season {
  season_number: number;
  name: string;
  episode_count: number;
}
interface Episode {
  id: number;
  episode_number: number;
  name: string;
  overview: string;
  still_path: string | null;
  air_date: string | null;
  runtime: number | null;
  vote_average: number;
}

export function SeasonSelector({
  tvId,
  seasons,
}: {
  tvId: number;
  seasons: Season[];
}) {
  const valid = useMemo(
    () => seasons.filter((s) => s.episode_count > 0).sort((a, b) => a.season_number - b.season_number),
    [seasons],
  );
  const firstReal = valid.find((s) => s.season_number >= 1) ?? valid[0];
  const [active, setActive] = useState<number>(firstReal?.season_number ?? 1);
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let on = true;
    setLoading(true);
    getSeason(tvId, active)
      .then((d) => on && setEpisodes(d.episodes ?? []))
      .catch(() => on && setEpisodes([]))
      .finally(() => on && setLoading(false));
    return () => {
      on = false;
    };
  }, [tvId, active]);

  if (!valid.length) return null;
  const activeSeason = valid.find((s) => s.season_number === active);

  return (
    <div className="px-4 py-2 sm:px-8">
      <div className="mb-5 flex items-center justify-between">
        <h2 className="font-display text-xl font-semibold tracking-tight sm:text-2xl">
          Episodes
        </h2>
        <div className="relative">
          <button
            onClick={() => setOpen((v) => !v)}
            onBlur={() => setTimeout(() => setOpen(false), 150)}
            className="glass flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition-colors hover:text-accent"
          >
            {activeSeason?.name ?? `Season ${active}`}
            <ChevronDown className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`} />
          </button>
          <AnimatePresence>
            {open && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="glass absolute right-0 z-30 mt-2 max-h-72 w-56 overflow-y-auto rounded-2xl border p-1.5 shadow-2xl"
              >
                {valid.map((s) => (
                  <button
                    key={s.season_number}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                      setActive(s.season_number);
                      setOpen(false);
                    }}
                    className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-sm transition-colors hover:bg-foreground/5 ${
                      s.season_number === active ? "text-accent" : "text-muted"
                    }`}
                  >
                    {s.name}
                    <span className="text-xs opacity-60">{s.episode_count} ep</span>
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="shimmer h-28 rounded-2xl" />
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {episodes.map((ep, i) => (
            <motion.div
              key={ep.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: Math.min(i * 0.04, 0.4) }}
            >
              <Link
                href={`/watch/tv/${tvId}/${active}/${ep.episode_number}`}
                className="group flex gap-4 overflow-hidden rounded-2xl border border-border bg-surface/50 p-3 transition-all hover:border-accent/50 hover:bg-surface"
              >
                <div className="relative aspect-video w-40 shrink-0 overflow-hidden rounded-xl bg-surface-2 sm:w-56">
                  {ep.still_path ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={img(ep.still_path, "w500")!}
                      alt={ep.name}
                      loading="lazy"
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  ) : (
                    <div className="grid h-full place-items-center text-xs text-muted">
                      No image
                    </div>
                  )}
                  <div className="absolute inset-0 grid place-items-center bg-black/30 opacity-0 transition-opacity group-hover:opacity-100">
                    <span className="grid h-11 w-11 place-items-center rounded-full bg-accent text-accent-foreground shadow-lg">
                      <Play className="h-5 w-5" fill="currentColor" />
                    </span>
                  </div>
                </div>

                <div className="min-w-0 flex-1 py-1">
                  <div className="flex items-baseline gap-2">
                    <span className="font-display text-lg font-bold text-accent">
                      {ep.episode_number}
                    </span>
                    <h3 className="truncate font-semibold">{ep.name}</h3>
                  </div>
                  <div className="mt-1 flex items-center gap-3 text-xs text-muted">
                    {ep.air_date && (
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {prettyDate(ep.air_date)}
                      </span>
                    )}
                    {ep.runtime ? <span>{ep.runtime}m</span> : null}
                  </div>
                  <p className="mt-2 line-clamp-2 text-sm text-foreground/70">
                    {ep.overview || "No description available."}
                  </p>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
