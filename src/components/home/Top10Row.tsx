"use client";

import { useRef } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { TmdbItem } from "@/lib/types";
import { img, type MediaType } from "@/lib/config";
import { mediaKind, mediaTitle } from "@/lib/tmdb";

// Netflix-style numbered Top 10 row: a giant rank digit sits behind each poster.
export function Top10Row({ title, items }: { title: string; items: TmdbItem[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const top = items.filter((i) => i.poster_path).slice(0, 10);
  if (top.length < 5) return null;

  const scroll = (dir: 1 | -1) => {
    ref.current?.scrollBy({
      left: dir * (ref.current.clientWidth * 0.85),
      behavior: "smooth",
    });
  };

  return (
    <section className="group/row relative py-4">
      <h2 className="mb-3 px-4 font-display text-xl font-semibold tracking-tight sm:px-8 sm:text-2xl">
        {title}
      </h2>

      <div className="relative">
        <button
          onClick={() => scroll(-1)}
          aria-label="Scroll left"
          className="absolute left-1 top-1/2 z-20 hidden h-11 w-11 -translate-y-1/2 place-items-center rounded-full glass opacity-0 transition-opacity hover:text-accent group-hover/row:opacity-100 md:grid"
        >
          <ChevronLeft className="h-6 w-6" />
        </button>

        <div
          ref={ref}
          className="row-scroll flex gap-2 overflow-x-auto px-4 pb-3 pt-2 sm:gap-3 sm:px-8"
        >
          {top.map((item, idx) => {
            const kind: MediaType = mediaKind(item);
            const name = mediaTitle(item);
            return (
              <Link
                key={item.id}
                href={`/${kind}/${item.id}`}
                className="group/t relative flex shrink-0 items-end"
              >
                {/* rank digit */}
                <span
                  className="pointer-events-none select-none font-display font-black leading-none text-transparent"
                  style={{
                    fontSize: "clamp(5rem, 13vw, 9rem)",
                    WebkitTextStroke: "2px var(--muted)",
                    marginRight: "-0.35em",
                    opacity: 0.55,
                  }}
                  aria-hidden
                >
                  {idx + 1}
                </span>

                <div className="relative aspect-[2/3] w-[120px] shrink-0 overflow-hidden rounded-xl border border-border bg-surface-2 shadow-md transition-[transform,box-shadow] duration-300 group-hover/t:-translate-y-1 group-hover/t:shadow-[0_12px_26px_rgba(var(--shadow-color),0.32)] group-hover/t:ring-1 group-hover/t:ring-accent/50 sm:w-[140px]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={img(item.poster_path, "w342")!}
                    alt={name}
                    loading="lazy"
                    className="h-full w-full object-cover transition-transform duration-300 group-hover/t:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 transition-opacity group-hover/t:opacity-100" />
                </div>
              </Link>
            );
          })}
        </div>

        <button
          onClick={() => scroll(1)}
          aria-label="Scroll right"
          className="absolute right-1 top-1/2 z-20 hidden h-11 w-11 -translate-y-1/2 place-items-center rounded-full glass opacity-0 transition-opacity hover:text-accent group-hover/row:opacity-100 md:grid"
        >
          <ChevronRight className="h-6 w-6" />
        </button>
      </div>
    </section>
  );
}
