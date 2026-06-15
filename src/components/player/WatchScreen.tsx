"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight, Home, Languages, SkipBack, SkipForward } from "lucide-react";
import type { MediaType } from "@/lib/config";
import { getDetailLite, getSeason } from "@/lib/tmdb";
import { cn } from "@/lib/utils";
import { isAnimeDetail, resolveAnime, type AnimeAudio, type AnimeMap } from "@/lib/anime";
import { useAuth } from "@/lib/auth-context";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { getProgressFor } from "@/lib/lists";
import { Logo } from "@/components/ui/Logo";
import { Splash } from "@/components/auth/StatusOverlays";
import { VidkingPlayer, type AnimeServer } from "@/components/player/VidkingPlayer";
import { PlayerSwitcher } from "@/components/player/PlayerSwitcher";
import { SubtitleOverlay } from "@/components/player/SubtitleOverlay";
import { useSubs } from "@/lib/subtitle-context";

interface Props {
  kind: MediaType;
  id: string;
  season?: number;
  episode?: number;
}

const ANIME_SERVERS: { id: AnimeServer; label: string }[] = [
  { id: "megaplay", label: "MegaPlay" },
  { id: "tryembed", label: "TryEmbed" },
];

export function WatchScreen({ kind, id, season, episode }: Props) {
  const { user } = useAuth();
  const { prefs } = useSubs();
  const [d, setD] = useState<any>(null);
  const [ep, setEp] = useState<any>(null);
  const [epCount, setEpCount] = useState(0);
  const [resume, setResume] = useState(0);
  const [ready, setReady] = useState(false);
  const [animeMap, setAnimeMap] = useState<AnimeMap | null>(null);
  const [audio, setAudio] = useState<AnimeAudio>("sub");
  const [animeServer, setAnimeServer] = useState<AnimeServer>("megaplay");

  // restore saved anime preferences (sub/dub + server)
  useEffect(() => {
    try {
      const a = localStorage.getItem("calypso.anime_audio");
      if (a === "sub" || a === "dub") setAudio(a);
      const s = localStorage.getItem("calypso.anime_server");
      if (s === "megaplay" || s === "tryembed") setAnimeServer(s);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    let on = true;
    setReady(false);
    setAnimeMap(null);
    (async () => {
      const detail = await getDetailLite(kind, id).catch(() => null);
      if (!on) return;
      setD(detail);

      // For anime, resolve this season's MAL/AniList ids (sub/dub players).
      const animeTitle = kind === "movie" ? detail?.title : detail?.name;
      if (detail && isAnimeDetail(detail) && animeTitle) {
        resolveAnime(animeTitle, kind === "movie" ? 1 : season ?? 1).then(
          (m) => on && setAnimeMap(m),
        );
      }

      if (kind === "tv" && season) {
        const s = await getSeason(id, season).catch(() => null);
        if (on && s?.episodes) {
          setEpCount(s.episodes.length);
          setEp(s.episodes.find((e: any) => e.episode_number === episode) ?? null);
        }
      }
      if (user) {
        const sb = createSupabaseBrowserClient();
        if (sb) {
          const p = await getProgressFor(
            sb,
            user.id,
            kind,
            Number(id),
            season ?? 0,
            episode ?? 0,
          );
          if (on && p && !p.completed) setResume(p.progress_seconds);
        }
      }
      if (on) setReady(true);
    })();
    return () => {
      on = false;
    };
  }, [kind, id, season, episode, user]);

  if (!ready || !d) return <Splash />;

  const title = kind === "movie" ? d.title : d.name;
  const imdbId = d.external_ids?.imdb_id as string | undefined;
  const detailHref = `/${kind}/${id}`;

  const isAnime = isAnimeDetail(d);

  // Work out the episode number to send the anime player.
  const requestedSeason = kind === "movie" ? 1 : season ?? 1;
  const matchedSeason = animeMap?.matchedSeason ?? 1;
  const perSeasonEpisode = kind === "movie" ? 1 : episode ?? 1;

  // Fallback for continuous-numbering entries we couldn't resolve per-season:
  // sum every prior numbered TMDB season so S2E9 (S1 = 24 eps) becomes ep 33.
  const absoluteEpisode = (() => {
    if (requestedSeason <= 1) return perSeasonEpisode;
    const priorEps = ((d.seasons ?? []) as { season_number: number; episode_count: number }[])
      .filter((s) => s.season_number >= 1 && s.season_number < requestedSeason)
      .reduce((sum, s) => sum + (s.episode_count ?? 0), 0);
    return priorEps + perSeasonEpisode;
  })();

  // If the resolver reached this exact season's own entry, its episodes restart
  // at 1 → use the per-season number. Otherwise it fell back to an earlier entry
  // that numbers episodes absolutely across seasons → use the absolute number.
  const episodeNumber =
    matchedSeason >= requestedSeason ? perSeasonEpisode : absoluteEpisode;

  const animeEmbed =
    isAnime && (animeMap?.malId || animeMap?.anilistId)
      ? {
          malId: animeMap.malId ?? null,
          anilistId: animeMap.anilistId ?? null,
          episodeNumber,
          audio,
          server: animeServer,
        }
      : null;

  function pickAudio(a: AnimeAudio) {
    setAudio(a);
    try {
      localStorage.setItem("calypso.anime_audio", a);
    } catch {
      // ignore
    }
  }

  function pickServer(s: AnimeServer) {
    setAnimeServer(s);
    try {
      localStorage.setItem("calypso.anime_server", s);
    } catch {
      // ignore
    }
  }

  // episode navigation
  const prevHref =
    kind === "tv" && episode && episode > 1
      ? `/watch/tv/${id}/${season}/${episode - 1}`
      : null;
  const nextHref =
    kind === "tv" && episode && epCount && episode < epCount
      ? `/watch/tv/${id}/${season}/${episode + 1}`
      : null;

  return (
    <div className="min-h-screen pb-16">
      {/* top bar */}
      <div className="sticky top-0 z-30 glass border-b">
        <div className="mx-auto flex h-16 max-w-[1600px] items-center gap-4 px-4 sm:px-8">
          <Link
            href={detailHref}
            className="flex items-center gap-1.5 text-sm font-medium text-muted transition-colors hover:text-foreground"
          >
            <ChevronLeft className="h-5 w-5" /> Back
          </Link>
          <div className="min-w-0 flex-1 text-center">
            <p className="truncate text-sm font-semibold">{title}</p>
            {kind === "tv" && (
              <p className="text-xs text-muted">
                S{season} · E{episode}
                {ep?.name ? ` — ${ep.name}` : ""}
              </p>
            )}
          </div>
          <Link href="/" className="text-muted transition-colors hover:text-accent">
            <Home className="h-5 w-5" />
          </Link>
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="mx-auto max-w-[1600px] px-4 pt-6 sm:px-8"
      >
        <div className="mx-auto max-w-[1180px]">
          {/* player + info */}
          <div>
            <VidkingPlayer
              mediaType={kind}
              tmdbId={Number(id)}
              season={season}
              episode={episode}
              resumeSeconds={resume}
              title={title}
              posterPath={d.poster_path}
              backdropPath={ep?.still_path ?? d.backdrop_path}
              glow={prefs.videoGlow}
              anime={animeEmbed}
            >
              <SubtitleOverlay
                tmdbId={Number(id)}
                imdbId={imdbId}
                season={season}
                episode={episode}
              />
            </VidkingPlayer>

            {isAnime && (
              <div className="mt-3 flex flex-col gap-3 rounded-xl border border-border bg-surface/40 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                <span className="flex items-center gap-2 text-sm text-muted">
                  <Languages className="h-4 w-4 text-accent" /> Anime
                </span>
                {animeMap === null ? (
                  <span className="text-xs text-muted">Matching…</span>
                ) : animeMap.malId || animeMap.anilistId ? (
                  <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-semibold uppercase tracking-wide text-muted">
                        Server
                      </span>
                      <div className="flex gap-1 rounded-full border border-border bg-surface-2/50 p-1">
                        {ANIME_SERVERS.map((s) => (
                          <button
                            key={s.id}
                            onClick={() => pickServer(s.id)}
                            className={cn(
                              "rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors",
                              animeServer === s.id
                                ? "bg-accent text-accent-foreground"
                                : "text-muted hover:text-foreground",
                            )}
                          >
                            {s.label}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-semibold uppercase tracking-wide text-muted">
                        Audio
                      </span>
                      <div className="flex gap-1 rounded-full border border-border bg-surface-2/50 p-1">
                        {(["sub", "dub"] as AnimeAudio[]).map((a) => (
                          <button
                            key={a}
                            onClick={() => pickAudio(a)}
                            className={cn(
                              "rounded-full px-3.5 py-1.5 text-xs font-bold uppercase tracking-wide transition-colors",
                              audio === a
                                ? "bg-accent text-accent-foreground"
                                : "text-muted hover:text-foreground",
                            )}
                          >
                            {a}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <span className="text-xs text-muted">
                    Audio options unavailable for this title
                  </span>
                )}
              </div>
            )}

            {/* anime has its own MegaPlay/TryEmbed server toggle above, so the
                general movie/series switcher is hidden in anime mode */}
            {!animeEmbed && <PlayerSwitcher />}

            {resume > 30 && (
              <p className="mt-2 text-xs text-accent">
                Resuming from where you left off.
              </p>
            )}

            {/* episode nav */}
            {kind === "tv" && (
              <div className="mt-4 flex items-center justify-between gap-3">
                {prevHref ? (
                  <Link
                    href={prevHref}
                    className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2.5 text-sm font-medium transition-colors hover:border-accent hover:text-accent"
                  >
                    <SkipBack className="h-4 w-4" /> Previous
                  </Link>
                ) : (
                  <span />
                )}
                {nextHref ? (
                  <Link
                    href={nextHref}
                    className="inline-flex items-center gap-2 rounded-full bg-accent px-4 py-2.5 text-sm font-bold text-accent-foreground transition-transform hover:scale-105"
                  >
                    Next Episode <SkipForward className="h-4 w-4" />
                  </Link>
                ) : (
                  <span />
                )}
              </div>
            )}

            <div className="mt-6">
              <h1 className="font-display text-2xl font-bold tracking-tight">
                {kind === "tv" && ep?.name ? ep.name : title}
              </h1>
              <p className="mt-2 max-w-3xl text-sm leading-relaxed text-foreground/75">
                {kind === "tv" ? ep?.overview || d.overview : d.overview}
              </p>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
