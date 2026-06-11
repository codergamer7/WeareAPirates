"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Bell,
  BellRing,
  Bookmark,
  Calendar,
  Check,
  Clock,
  Eye,
  Heart,
  Play,
  Plus,
  Star,
} from "lucide-react";
import type { ListType } from "@/lib/types";
import { img, type MediaType } from "@/lib/config";
import { getDetail } from "@/lib/tmdb";
import { cn, prettyDate, runtime as fmtRuntime, yearOf } from "@/lib/utils";
import { useAuth } from "@/lib/auth-context";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import {
  getListStatus,
  isRemindered,
  isWatched,
  markWatched,
  toggleList,
  toggleReminder,
  unmarkWatched,
} from "@/lib/lists";
import { CastRow } from "@/components/media/CastRow";
import { SeasonSelector } from "@/components/media/SeasonSelector";
import { MediaRow } from "@/components/media/MediaRow";
import { TrailerModal } from "@/components/media/TrailerModal";
import { Splash } from "@/components/auth/StatusOverlays";

function certOf(kind: MediaType, d: any): string | null {
  try {
    if (kind === "movie") {
      const us = d.release_dates?.results?.find((r: any) => r.iso_3166_1 === "US");
      return us?.release_dates?.find((x: any) => x.certification)?.certification || null;
    }
    const us = d.content_ratings?.results?.find((r: any) => r.iso_3166_1 === "US");
    return us?.rating || null;
  } catch {
    return null;
  }
}

export function DetailView({ kind, id }: { kind: MediaType; id: string }) {
  const { user } = useAuth();
  const [d, setD] = useState<any>(null);
  const [imdb, setImdb] = useState<string | null>(null);
  const [status, setStatus] = useState<Record<ListType, boolean>>({
    watchlist: false,
    saved: false,
    favorite: false,
  });
  const [watched, setWatched] = useState(false);
  const [remindered, setRemindered] = useState(false);
  const [trailer, setTrailer] = useState<string | null>(null);
  const [trailerOpen, setTrailerOpen] = useState(false);
  const [err, setErr] = useState(false);

  useEffect(() => {
    let on = true;
    setD(null);
    setErr(false);
    getDetail(kind, id)
      .then(async (data) => {
      if (!on) return;
      if (data?.success === false || !data?.id) {
        setErr(true);
        return;
      }
      setD(data);
      const yt = data.videos?.results?.find(
        (v: any) => v.site === "YouTube" && (v.type === "Trailer" || v.type === "Teaser"),
      );
      setTrailer(yt?.key ?? null);
      const imdbId = data.external_ids?.imdb_id;
      if (imdbId) {
        try {
          const r = await fetch(`/api/omdb?i=${imdbId}`).then((x) => x.json());
          if (on && r.imdbRating && r.imdbRating !== "N/A") setImdb(r.imdbRating);
        } catch {}
      }
      })
      .catch(() => on && setErr(true));
    return () => {
      on = false;
    };
  }, [kind, id]);

  useEffect(() => {
    if (!user || !d) return;
    const sb = createSupabaseBrowserClient();
    if (!sb) return;
    getListStatus(sb, user.id, kind, Number(id)).then(setStatus);
    isWatched(sb, user.id, kind, Number(id)).then(setWatched);
    isRemindered(sb, user.id, kind, Number(id)).then(setRemindered);
  }, [user, d, kind, id]);

  if (err)
    return (
      <div className="grid min-h-screen place-items-center px-6 text-center">
        <div>
          <h1 className="font-display text-3xl font-bold">Lost at sea</h1>
          <p className="mt-2 text-muted">We couldn’t find that title.</p>
          <Link href="/" className="mt-6 inline-block rounded-full bg-accent px-6 py-3 text-sm font-bold text-accent-foreground">
            Back home
          </Link>
        </div>
      </div>
    );
  if (!d) return <Splash />;

  const title = kind === "movie" ? d.title : d.name;
  const date = kind === "movie" ? d.release_date : d.first_air_date;
  const rt = kind === "movie" ? d.runtime : d.episode_run_time?.[0];
  const cert = certOf(kind, d);
  const recs = d.recommendations?.results?.filter((r: any) => r.poster_path) ?? [];

  const firstSeason =
    kind === "tv"
      ? (d.seasons?.find((s: any) => s.season_number >= 1 && s.episode_count > 0) ??
          d.seasons?.[0])?.season_number ?? 1
      : 1;
  const playHref =
    kind === "movie" ? `/watch/movie/${id}` : `/watch/tv/${id}/${firstSeason}/1`;

  // Upcoming hook for "Remind me": a future movie release or the next TV episode.
  const today = new Date().toISOString().slice(0, 10);
  let upcoming: { air_date: string; label: string } | null = null;
  if (kind === "movie") {
    if (date && date > today) upcoming = { air_date: date, label: "Premiere" };
  } else {
    const ne = d.next_episode_to_air;
    if (ne?.air_date)
      upcoming = {
        air_date: ne.air_date,
        label: `S${ne.season_number} · E${ne.episode_number}`,
      };
  }

  async function toggle(listType: ListType) {
    if (!user) return;
    const sb = createSupabaseBrowserClient();
    if (!sb) return;
    const now = await toggleList(
      sb,
      user.id,
      { media_type: kind, tmdb_id: Number(id), title, poster_path: d.poster_path },
      listType,
    );
    setStatus((s) => ({ ...s, [listType]: now }));
  }

  async function toggleWatched() {
    if (!user) return;
    const sb = createSupabaseBrowserClient();
    if (!sb) return;
    if (watched) {
      await unmarkWatched(sb, user.id, kind, Number(id));
      setWatched(false);
    } else {
      await markWatched(sb, user.id, {
        media_type: kind,
        tmdb_id: Number(id),
        title,
        poster_path: d.poster_path,
        backdrop_path: d.backdrop_path,
      });
      setWatched(true);
    }
  }

  async function toggleRemind() {
    if (!user) return;
    const sb = createSupabaseBrowserClient();
    if (!sb) return;
    const now = await toggleReminder(sb, user.id, {
      media_type: kind,
      tmdb_id: Number(id),
      title,
      poster_path: d.poster_path,
      backdrop_path: d.backdrop_path,
      air_date: upcoming?.air_date ?? null,
      label: upcoming?.label ?? null,
    });
    setRemindered(now);
  }

  return (
    <div className="pb-20">
      {/* ---- Backdrop hero ---- */}
      <div className="relative">
        <div className="relative h-[62vh] min-h-[460px] w-full overflow-hidden">
          {d.backdrop_path && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={img(d.backdrop_path, "original")!}
              alt={title}
              className="h-full w-full object-cover object-top"
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-background/10" />
          <div className="absolute inset-0 bg-gradient-to-r from-background/90 to-transparent" />
        </div>

        <div className="mx-auto -mt-56 max-w-[1500px] px-4 sm:px-8">
          <div className="flex flex-col gap-8 md:flex-row">
            {/* poster */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="relative z-10 hidden w-56 shrink-0 md:block"
            >
              {d.poster_path && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={img(d.poster_path, "w500")!}
                  alt={title}
                  className="w-full rounded-2xl border border-border shadow-2xl"
                />
              )}
            </motion.div>

            {/* info */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="relative z-10 flex-1 pt-4"
            >
              <h1 className="font-display text-4xl font-bold leading-tight tracking-tight drop-shadow-xl sm:text-5xl lg:text-6xl">
                {title}
              </h1>
              {d.tagline && (
                <p className="mt-2 font-display text-lg italic text-muted">{d.tagline}</p>
              )}

              <div className="mt-4 flex flex-wrap items-center gap-2.5 text-sm">
                {imdb && (
                  <span className="flex items-center gap-1.5 rounded-lg bg-[#f5c518] px-2.5 py-1 text-xs font-bold text-black">
                    IMDb {imdb}
                  </span>
                )}
                {!!d.vote_average && (
                  <span className="flex items-center gap-1 rounded-lg border border-border px-2.5 py-1 text-accent-bright">
                    <Star className="h-3.5 w-3.5" fill="currentColor" />
                    {d.vote_average.toFixed(1)}
                  </span>
                )}
                {cert && (
                  <span className="rounded-lg border border-border px-2 py-1 text-xs font-semibold text-muted">
                    {cert}
                  </span>
                )}
                <span className="flex items-center gap-1 text-muted">
                  <Calendar className="h-4 w-4" /> {yearOf(date) || "TBA"}
                </span>
                {rt ? (
                  <span className="flex items-center gap-1 text-muted">
                    <Clock className="h-4 w-4" /> {fmtRuntime(rt)}
                  </span>
                ) : null}
                {kind === "tv" && d.number_of_seasons ? (
                  <span className="text-muted">{d.number_of_seasons} seasons</span>
                ) : null}
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                {d.genres?.map((g: any) => (
                  <span
                    key={g.id}
                    className="rounded-full border border-border bg-surface/50 px-3 py-1 text-xs text-muted"
                  >
                    {g.name}
                  </span>
                ))}
              </div>

              <p className="mt-5 max-w-3xl text-base leading-relaxed text-foreground/85">
                {d.overview}
              </p>

              {date && (
                <p className="mt-3 text-sm text-muted">
                  <span className="font-semibold text-foreground/70">
                    {kind === "movie" ? "Released" : "First aired"}:
                  </span>{" "}
                  {prettyDate(date)}
                </p>
              )}

              {/* actions */}
              <div className="mt-7 flex flex-wrap items-center gap-3">
                <Link
                  href={playHref}
                  className="group inline-flex items-center gap-2 rounded-full bg-accent px-7 py-3.5 text-sm font-bold text-accent-foreground shadow-[0_8px_28px_var(--glow)] transition-transform hover:scale-[1.04] active:scale-95"
                >
                  <Play className="h-5 w-5 transition-transform group-hover:scale-110" fill="currentColor" /> Play
                </Link>
                {trailer && (
                  <button
                    onClick={() => setTrailerOpen(true)}
                    className="inline-flex items-center gap-2 rounded-full glass px-5 py-3.5 text-sm font-semibold transition-colors hover:text-accent"
                  >
                    Trailer
                  </button>
                )}
                <ActionPill
                  active={status.watchlist}
                  onClick={() => toggle("watchlist")}
                  activeIcon={<Check className="h-5 w-5" />}
                  idleIcon={<Plus className="h-5 w-5" />}
                  label="Watchlist"
                />
                <ActionPill
                  active={status.saved}
                  onClick={() => toggle("saved")}
                  activeIcon={<Bookmark className="h-5 w-5" fill="currentColor" />}
                  idleIcon={<Bookmark className="h-5 w-5" />}
                  label="Save"
                />
                <ActionPill
                  active={status.favorite}
                  onClick={() => toggle("favorite")}
                  activeIcon={<Heart className="h-5 w-5" fill="currentColor" />}
                  idleIcon={<Heart className="h-5 w-5" />}
                  label="Favorite"
                />
                <ActionPill
                  active={watched}
                  onClick={toggleWatched}
                  activeIcon={<Eye className="h-5 w-5" fill="currentColor" />}
                  idleIcon={<Eye className="h-5 w-5" />}
                  label={watched ? "Watched" : "Mark watched"}
                />
                {(upcoming || remindered) && (
                  <ActionPill
                    active={remindered}
                    onClick={toggleRemind}
                    activeIcon={<BellRing className="h-5 w-5" fill="currentColor" />}
                    idleIcon={<Bell className="h-5 w-5" />}
                    label={remindered ? "Reminding" : "Remind me"}
                  />
                )}
              </div>
            </motion.div>
          </div>
        </div>
      </div>

      {/* ---- TV episodes ---- */}
      {kind === "tv" && d.seasons && (
        <div className="mt-12">
          <SeasonSelector tvId={Number(id)} seasons={d.seasons} />
        </div>
      )}

      {/* ---- Cast ---- */}
      <div className="mt-10">
        <CastRow cast={d.credits?.cast ?? []} />
      </div>

      {/* ---- Recommendations ---- */}
      {recs.length > 0 && (
        <div className="mt-6">
          <MediaRow title="More Like This" items={recs} />
        </div>
      )}

      {/* ---- Trailer modal ---- */}
      <TrailerModal
        youtubeKey={trailerOpen ? trailer : null}
        title={title}
        onClose={() => setTrailerOpen(false)}
      />
    </div>
  );
}

function ActionPill({
  active,
  onClick,
  activeIcon,
  idleIcon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  activeIcon: React.ReactNode;
  idleIcon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      title={label}
      className={cn(
        "group inline-flex items-center gap-2 rounded-full border px-4 py-3.5 text-sm font-semibold transition-all active:scale-95",
        active
          ? "border-accent bg-accent/15 text-accent"
          : "border-border text-muted hover:border-accent/50 hover:text-foreground",
      )}
    >
      {active ? activeIcon : idleIcon}
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}
