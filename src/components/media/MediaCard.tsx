"use client";

import { useState } from "react";
import Link from "next/link";
import { Bookmark, Play, Star } from "lucide-react";
import type { TmdbItem } from "@/lib/types";
import { img, type MediaType } from "@/lib/config";
import { mediaDate, mediaKind, mediaTitle } from "@/lib/tmdb";
import { yearOf, cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth-context";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { toggleList } from "@/lib/lists";

interface Props {
  item: TmdbItem;
  index?: number;
  progress?: number; // 0–100, for continue-watching
}

export function MediaCard({ item, progress }: Props) {
  const { user } = useAuth();
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);

  const kind: MediaType = mediaKind(item);
  const title = mediaTitle(item);
  const year = yearOf(mediaDate(item));
  const poster = img(item.poster_path, "w342");
  const rating = item.vote_average ? item.vote_average.toFixed(1) : null;

  async function quickSave(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!user || busy) return;
    const sb = createSupabaseBrowserClient();
    if (!sb) return;
    setBusy(true);
    const now = await toggleList(
      sb,
      user.id,
      { media_type: kind, tmdb_id: item.id, title, poster_path: item.poster_path },
      "watchlist",
    );
    setSaved(now);
    setBusy(false);
  }

  return (
    <div className="group/card relative w-[150px] shrink-0 sm:w-[172px]">
      <Link href={`/${kind}/${item.id}`} className="block">
        <div className="relative aspect-[2/3] overflow-hidden rounded-xl border border-border bg-surface-2 shadow-md transition-[transform,box-shadow] duration-300 group-hover/card:-translate-y-1 group-hover/card:shadow-[0_12px_26px_rgba(var(--shadow-color),0.32)] group-hover/card:ring-1 group-hover/card:ring-accent/50 group-active/card:scale-[0.98]">
          {poster ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={poster}
              alt={title}
              loading="lazy"
              className="h-full w-full object-cover transition-transform duration-300 group-hover/card:scale-105"
            />
          ) : (
            <div className="grid h-full place-items-center p-3 text-center text-xs text-muted">
              {title}
            </div>
          )}

          {/* hover gradient + actions */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/10 to-transparent opacity-0 transition-opacity duration-300 group-hover/card:opacity-100" />

          {/* sheen sweep */}
          <span className="card-sheen group-hover/card:[transform:translateX(130%)]" />

          {rating && (
            <span className="absolute left-2 top-2 flex items-center gap-1 rounded-full bg-black/65 px-2 py-0.5 text-[11px] font-semibold text-accent-bright">
              <Star className="h-3 w-3" fill="currentColor" />
              {rating}
            </span>
          )}

          {user && (
            <button
              onClick={quickSave}
              aria-label="Add to watchlist"
              className={cn(
                "absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-full bg-black/60 text-white opacity-0 transition-all duration-200 hover:bg-accent hover:text-accent-foreground group-hover/card:opacity-100",
                saved && "bg-accent text-accent-foreground opacity-100",
              )}
            >
              <Bookmark className="h-4 w-4" fill={saved ? "currentColor" : "none"} />
            </button>
          )}

          <div className="absolute inset-x-0 bottom-0 translate-y-2 p-3 opacity-0 transition-all duration-300 group-hover/card:translate-y-0 group-hover/card:opacity-100">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-accent px-3 py-1.5 text-xs font-bold text-accent-foreground shadow-lg">
              <Play className="h-3.5 w-3.5" fill="currentColor" /> Details
            </span>
          </div>

          {typeof progress === "number" && progress > 0 && (
            <div className="absolute inset-x-0 bottom-0 h-1 bg-black/50">
              <div
                className="h-full bg-accent"
                style={{ width: `${Math.min(100, progress)}%` }}
              />
            </div>
          )}
        </div>
      </Link>

      <div className="mt-2 px-0.5">
        <p className="truncate text-sm font-medium text-foreground/90">{title}</p>
        <p className="text-xs text-muted">
          {year}
          {year && <span className="mx-1.5 opacity-40">•</span>}
          <span className="uppercase tracking-wide">{kind === "tv" ? "Series" : "Film"}</span>
        </p>
      </div>
    </div>
  );
}
