"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight, Home, SkipBack, SkipForward } from "lucide-react";
import type { MediaType } from "@/lib/config";
import { getDetail, getSeason } from "@/lib/tmdb";
import { useAuth } from "@/lib/auth-context";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { getProgressFor } from "@/lib/lists";
import { Logo } from "@/components/ui/Logo";
import { Splash } from "@/components/auth/StatusOverlays";
import { VidkingPlayer } from "@/components/player/VidkingPlayer";
import { PlayerSwitcher } from "@/components/player/PlayerSwitcher";
import { SubtitleOverlay } from "@/components/player/SubtitleOverlay";
import { useSubs } from "@/lib/subtitle-context";

interface Props {
  kind: MediaType;
  id: string;
  season?: number;
  episode?: number;
}

export function WatchScreen({ kind, id, season, episode }: Props) {
  const { user } = useAuth();
  const { prefs } = useSubs();
  const [d, setD] = useState<any>(null);
  const [ep, setEp] = useState<any>(null);
  const [epCount, setEpCount] = useState(0);
  const [resume, setResume] = useState(0);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let on = true;
    setReady(false);
    (async () => {
      const detail = await getDetail(kind, id).catch(() => null);
      if (!on) return;
      setD(detail);
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
            >
              <SubtitleOverlay
                tmdbId={Number(id)}
                imdbId={imdbId}
                season={season}
                episode={episode}
              />
            </VidkingPlayer>

            <PlayerSwitcher />

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
