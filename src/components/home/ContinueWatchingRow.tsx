"use client";

import { useRef } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Play, X } from "lucide-react";
import type { WatchProgress } from "@/lib/types";
import { img } from "@/lib/config";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { removeProgress } from "@/lib/lists";

function resumeHref(p: WatchProgress) {
  return p.media_type === "movie"
    ? `/watch/movie/${p.tmdb_id}`
    : `/watch/tv/${p.tmdb_id}/${p.season || 1}/${p.episode || 1}`;
}

export function ContinueWatchingRow({
  items,
  onChange,
}: {
  items: WatchProgress[];
  onChange: (next: WatchProgress[]) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  if (!items.length) return null;

  const scroll = (d: 1 | -1) => {
    ref.current?.scrollBy({ left: d * (ref.current.clientWidth * 0.85), behavior: "smooth" });
  };

  async function remove(p: WatchProgress) {
    const sb = createSupabaseBrowserClient();
    if (sb) await removeProgress(sb, p.id);
    onChange(items.filter((x) => x.id !== p.id));
  }

  return (
    <section className="group/row relative py-4">
      <h2 className="mb-3 px-4 font-display text-xl font-semibold tracking-tight sm:px-8 sm:text-2xl">
        Continue Watching
      </h2>
      <div className="relative">
        <button
          onClick={() => scroll(-1)}
          className="absolute left-1 top-1/2 z-20 hidden -translate-y-1/2 h-11 w-11 place-items-center rounded-full glass opacity-0 transition-opacity hover:text-accent group-hover/row:opacity-100 md:grid"
        >
          <ChevronLeft className="h-6 w-6" />
        </button>

        <div ref={ref} className="row-scroll flex gap-3.5 overflow-x-auto px-4 pb-3 pt-2 sm:px-8">
          {items.map((p) => (
            <div
              key={p.id}
              className="group/c relative w-[230px] shrink-0 sm:w-[270px]"
            >
              <Link href={resumeHref(p)}>
                <div className="relative aspect-video overflow-hidden rounded-xl border border-border bg-surface-2 shadow-lg transition-all group-hover/c:-translate-y-1 group-hover/c:ring-1 group-hover/c:ring-accent">
                  {p.backdrop_path || p.poster_path ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={img(p.backdrop_path || p.poster_path, "w500")!}
                      alt={p.title ?? ""}
                      loading="lazy"
                      className="h-full w-full object-cover transition-transform duration-500 group-hover/c:scale-105"
                    />
                  ) : null}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-transparent to-transparent" />

                  <div className="absolute inset-0 grid place-items-center opacity-0 transition-opacity group-hover/c:opacity-100">
                    <span className="grid h-14 w-14 place-items-center rounded-full bg-accent/90 text-accent-foreground shadow-xl">
                      <Play className="h-6 w-6" fill="currentColor" />
                    </span>
                  </div>

                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      remove(p);
                    }}
                    aria-label="Remove"
                    className="absolute right-2 top-2 grid h-7 w-7 place-items-center rounded-full bg-black/60 text-white opacity-0 backdrop-blur transition-opacity hover:bg-red-500 group-hover/c:opacity-100"
                  >
                    <X className="h-4 w-4" />
                  </button>

                  <div className="absolute inset-x-0 bottom-0 p-3">
                    <p className="truncate text-sm font-semibold drop-shadow">{p.title}</p>
                    {p.media_type === "tv" && (
                      <p className="text-xs text-white/70">
                        S{p.season || 1} · E{p.episode || 1}
                      </p>
                    )}
                    <div className="mt-2 h-1 overflow-hidden rounded-full bg-white/25">
                      <div
                        className="h-full rounded-full bg-accent"
                        style={{ width: `${Math.max(3, Math.min(100, p.progress_percent))}%` }}
                      />
                    </div>
                  </div>
                </div>
              </Link>
            </div>
          ))}
        </div>

        <button
          onClick={() => scroll(1)}
          className="absolute right-1 top-1/2 z-20 hidden -translate-y-1/2 h-11 w-11 place-items-center rounded-full glass opacity-0 transition-opacity hover:text-accent group-hover/row:opacity-100 md:grid"
        >
          <ChevronRight className="h-6 w-6" />
        </button>
      </div>
    </section>
  );
}
