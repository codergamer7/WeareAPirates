"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { Film, Info, Play, Star } from "lucide-react";
import type { TmdbItem } from "@/lib/types";
import { img, type MediaType } from "@/lib/config";
import { getTrailerKey, mediaDate, mediaKind, mediaTitle } from "@/lib/tmdb";
import { yearOf } from "@/lib/utils";
import { TrailerModal } from "@/components/media/TrailerModal";

export function Hero({ items }: { items: TmdbItem[] }) {
  const [i, setI] = useState(0);
  const [trailerKey, setTrailerKey] = useState<string | null>(null);
  const [trailerLoading, setTrailerLoading] = useState(false);
  const slides = items.filter((it) => it.backdrop_path).slice(0, 6);

  useEffect(() => {
    if (slides.length < 2) return;
    const t = setInterval(() => setI((v) => (v + 1) % slides.length), 7000);
    return () => clearInterval(t);
  }, [slides.length]);

  if (!slides.length) return <div className="h-[58vh]" />;

  const item = slides[i];
  const kind: MediaType = mediaKind(item);
  const title = mediaTitle(item);
  const playHref = kind === "movie" ? `/watch/movie/${item.id}` : `/tv/${item.id}`;

  async function openTrailer() {
    if (trailerLoading) return;
    setTrailerLoading(true);
    const key = await getTrailerKey(kind, item.id);
    setTrailerLoading(false);
    if (key) setTrailerKey(key);
  }

  return (
    <section className="relative h-[88vh] min-h-[560px] w-full overflow-hidden">
      <AnimatePresence mode="popLayout">
        <motion.div
          key={item.id}
          initial={{ opacity: 0, scale: 1.08 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1.1, ease: "easeOut" }}
          className="absolute inset-0"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={img(item.backdrop_path, "original")!}
            alt={title}
            className="h-full w-full object-cover object-top"
          />
        </motion.div>
      </AnimatePresence>

      {/* legibility gradients */}
      <div className="absolute inset-0 bg-gradient-to-r from-background via-background/70 to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-t from-background via-background/30 to-transparent" />

      <div className="absolute inset-x-0 bottom-0">
        <div className="mx-auto max-w-[1500px] px-4 pb-16 sm:px-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.6 }}
              className="max-w-2xl"
            >
              <div className="mb-3 flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.2em] text-accent">
                <span>{kind === "tv" ? "Series" : "Film"}</span>
                <span className="opacity-40">/</span>
                <span className="text-muted">{yearOf(mediaDate(item))}</span>
                {!!item.vote_average && (
                  <span className="flex items-center gap-1 text-accent-bright">
                    <Star className="h-3.5 w-3.5" fill="currentColor" />
                    {item.vote_average.toFixed(1)}
                  </span>
                )}
              </div>

              <h1 className="font-display text-5xl font-bold leading-[1.05] tracking-tight drop-shadow-2xl sm:text-6xl lg:text-7xl">
                {title}
              </h1>

              <p className="mt-4 line-clamp-3 max-w-xl text-base leading-relaxed text-foreground/80">
                {item.overview}
              </p>

              <div className="mt-7 flex flex-wrap items-center gap-3">
                <Link
                  href={playHref}
                  className="group inline-flex items-center gap-2 rounded-full bg-accent px-7 py-3.5 text-sm font-bold text-accent-foreground shadow-[0_8px_28px_var(--glow)] transition-transform hover:scale-[1.04] active:scale-95"
                >
                  <Play className="h-5 w-5 transition-transform group-hover:scale-110" fill="currentColor" />
                  Play now
                </Link>
                <button
                  onClick={openTrailer}
                  disabled={trailerLoading}
                  className="inline-flex items-center gap-2 rounded-full glass px-6 py-3.5 text-sm font-semibold transition-colors hover:text-accent disabled:opacity-60"
                >
                  {trailerLoading ? (
                    <span className="h-5 w-5 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  ) : (
                    <Film className="h-5 w-5" />
                  )}
                  Trailer
                </button>
                <Link
                  href={`/${kind}/${item.id}`}
                  className="inline-flex items-center gap-2 rounded-full glass px-6 py-3.5 text-sm font-semibold transition-colors hover:text-accent"
                >
                  <Info className="h-5 w-5" />
                  More info
                </Link>
              </div>
            </motion.div>
          </AnimatePresence>

          {/* dots */}
          <div className="mt-8 flex gap-2">
            {slides.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setI(idx)}
                aria-label={`Slide ${idx + 1}`}
                className="h-1.5 rounded-full transition-all duration-500"
                style={{
                  width: idx === i ? 36 : 12,
                  background: idx === i ? "var(--accent)" : "var(--border)",
                }}
              />
            ))}
          </div>
        </div>
      </div>

      <TrailerModal
        youtubeKey={trailerKey}
        title={title}
        onClose={() => setTrailerKey(null)}
      />
    </section>
  );
}
