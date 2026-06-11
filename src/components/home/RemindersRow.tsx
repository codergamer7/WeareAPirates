"use client";

import { useRef } from "react";
import Link from "next/link";
import { Bell, ChevronLeft, ChevronRight, Sparkles, X } from "lucide-react";
import type { Reminder } from "@/lib/types";
import { img } from "@/lib/config";
import { prettyDate } from "@/lib/utils";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { removeReminder } from "@/lib/lists";

function daysUntil(date: string | null): number | null {
  if (!date) return null;
  const target = new Date(date + "T00:00:00");
  if (isNaN(target.getTime())) return null;
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - now.getTime()) / 86_400_000);
}

export function RemindersRow({
  items,
  onChange,
}: {
  items: Reminder[];
  onChange: (next: Reminder[]) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  if (!items.length) return null;

  const scroll = (d: 1 | -1) => {
    ref.current?.scrollBy({
      left: d * (ref.current.clientWidth * 0.85),
      behavior: "smooth",
    });
  };

  async function remove(r: Reminder) {
    const sb = createSupabaseBrowserClient();
    if (sb) await removeReminder(sb, r.id);
    onChange(items.filter((x) => x.id !== r.id));
  }

  return (
    <section className="group/row relative py-4">
      <h2 className="mb-3 flex items-center gap-2 px-4 font-display text-xl font-semibold tracking-tight sm:px-8 sm:text-2xl">
        <Bell className="h-5 w-5 text-accent" />
        Reminders
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
          className="row-scroll flex gap-3.5 overflow-x-auto px-4 pb-3 pt-2 sm:px-8"
        >
          {items.map((r) => {
            const d = daysUntil(r.air_date);
            const available = d !== null && d <= 0;
            return (
              <div key={r.id} className="group/c relative w-[230px] shrink-0 sm:w-[270px]">
                <Link href={`/${r.media_type}/${r.tmdb_id}`}>
                  <div className="relative aspect-video overflow-hidden rounded-xl border border-border bg-surface-2 shadow-lg transition-all group-hover/c:-translate-y-1 group-hover/c:ring-1 group-hover/c:ring-accent">
                    {r.backdrop_path || r.poster_path ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={img(r.backdrop_path || r.poster_path, "w500")!}
                        alt={r.title ?? ""}
                        loading="lazy"
                        className="h-full w-full object-cover transition-transform duration-500 group-hover/c:scale-105"
                      />
                    ) : null}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-transparent to-transparent" />

                    {available ? (
                      <span className="absolute left-2 top-2 flex items-center gap-1 rounded-full bg-accent px-2.5 py-1 text-[11px] font-bold text-accent-foreground shadow">
                        <Sparkles className="h-3 w-3" /> Available now
                      </span>
                    ) : d !== null ? (
                      <span className="absolute left-2 top-2 rounded-full bg-black/70 px-2.5 py-1 text-[11px] font-semibold text-white">
                        in {d} {d === 1 ? "day" : "days"}
                      </span>
                    ) : null}

                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        remove(r);
                      }}
                      aria-label="Remove reminder"
                      className="absolute right-2 top-2 grid h-7 w-7 place-items-center rounded-full bg-black/60 text-white opacity-0 backdrop-blur transition-opacity hover:bg-red-500 group-hover/c:opacity-100"
                    >
                      <X className="h-4 w-4" />
                    </button>

                    <div className="absolute inset-x-0 bottom-0 p-3">
                      <p className="truncate text-sm font-semibold drop-shadow">{r.title}</p>
                      <p className="text-xs text-white/70">
                        {r.label ? `${r.label} · ` : ""}
                        {r.air_date ? prettyDate(r.air_date) : "Coming soon"}
                      </p>
                    </div>
                  </div>
                </Link>
              </div>
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
