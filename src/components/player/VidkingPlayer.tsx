"use client";

import { useEffect, useRef } from "react";
import {
  ACCENT_HEX,
  VIDKING_BASE,
  VIDLINK_BASE,
  VIDSYNC_BASE,
  type MediaType,
} from "@/lib/config";
import { type PlayerProvider } from "@/lib/player-provider";
import { usePlayerPreference } from "@/lib/player-context";
import { useAuth } from "@/lib/auth-context";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { upsertProgress } from "@/lib/lists";

interface Props {
  mediaType: MediaType;
  tmdbId: number;
  season?: number;
  episode?: number;
  resumeSeconds?: number;
  title: string;
  posterPath: string | null;
  backdropPath: string | null;
  glow?: boolean;
  children?: React.ReactNode;
}

// PLAYER_EVENT shape emitted by compatible embed iframes.
interface PlayerEvent {
  type: "PLAYER_EVENT";
  data: {
    event: "timeupdate" | "play" | "pause" | "ended" | "seeked";
    currentTime: number;
    duration: number;
    progress: number;
  };
}

export function VidkingPlayer({
  mediaType,
  tmdbId,
  season,
  episode,
  resumeSeconds = 0,
  title,
  posterPath,
  backdropPath,
  glow,
  children,
}: Props) {
  const { user } = useAuth();
  const lastSaved = useRef(0);
  const { provider } = usePlayerPreference();

  const src = buildEmbedSrc({
    provider,
    mediaType,
    tmdbId,
    season,
    episode,
    resumeSeconds,
  });

  useEffect(() => {
    function save(currentTime: number, duration: number, force: boolean) {
      if (!user || !duration || currentTime < 1) return;
      const now = Date.now();
      if (!force && now - lastSaved.current < 12000) return;
      lastSaved.current = now;
      const sb = createSupabaseBrowserClient();
      if (!sb) return;
      void upsertProgress(sb, user.id, {
        media_type: mediaType,
        tmdb_id: tmdbId,
        season: season ?? 0,
        episode: episode ?? 0,
        title,
        poster_path: posterPath,
        backdrop_path: backdropPath,
        progress_seconds: currentTime,
        duration_seconds: duration,
      });
    }

    function onMessage(e: MessageEvent) {
      let payload: unknown = e.data;
      if (typeof payload === "string") {
        try {
          payload = JSON.parse(payload);
        } catch {
          return;
        }
      }
      const evt = payload as PlayerEvent;
      if (!evt || evt.type !== "PLAYER_EVENT" || !evt.data) return;
      const { event, currentTime, duration } = evt.data;
      const force = event === "pause" || event === "ended" || event === "seeked";
      save(currentTime, duration, force);
    }

    window.addEventListener("message", onMessage);
    // best-effort flush when leaving the page
    const onHide = () => (lastSaved.current = 0);
    window.addEventListener("beforeunload", onHide);
    return () => {
      window.removeEventListener("message", onMessage);
      window.removeEventListener("beforeunload", onHide);
    };
  }, [user, mediaType, tmdbId, season, episode, title, posterPath, backdropPath]);

  return (
    <div className="relative">
      {glow && (
        <div
          className="animate-pulse-glow pointer-events-none absolute -inset-3 -z-10 rounded-[2rem] blur-2xl sm:-inset-5"
          style={{
            background:
              "radial-gradient(55% 55% at 50% 50%, var(--glow), transparent 70%)",
          }}
        />
      )}
      <div className="relative aspect-video w-full overflow-hidden rounded-2xl border border-border bg-black shadow-[0_30px_80px_rgba(0,0,0,0.6)]">
        <iframe
          key={src}
          src={src}
          title={`${title} on ${provider}`}
          allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
          allowFullScreen
          referrerPolicy="origin"
          className="absolute inset-0 h-full w-full"
        />
        {children}
      </div>
    </div>
  );
}

function buildEmbedSrc({
  provider,
  mediaType,
  tmdbId,
  season,
  episode,
  resumeSeconds,
}: {
  provider: PlayerProvider;
  mediaType: MediaType;
  tmdbId: number;
  season?: number;
  episode?: number;
  resumeSeconds: number;
}) {
  if (provider === "vidsync") {
    const base =
      mediaType === "movie"
        ? `${VIDSYNC_BASE}/movie/${tmdbId}`
        : `${VIDSYNC_BASE}/tv/${tmdbId}/${season ?? 1}/${episode ?? 1}`;
    const p = new URLSearchParams({ autoPlay: "true", theme: ACCENT_HEX });
    if (resumeSeconds > 5) p.set("startTime", String(Math.floor(resumeSeconds)));
    if (mediaType === "tv") {
      p.set("nextButton", "true");
      p.set("autoNext", "true");
    }
    return `${base}?${p.toString()}`;
  }

  if (provider === "vidlink") {
    const base =
      mediaType === "movie"
        ? `${VIDLINK_BASE}/movie/${tmdbId}`
        : `${VIDLINK_BASE}/tv/${tmdbId}/${season ?? 1}/${episode ?? 1}`;
    const p = new URLSearchParams({
      primaryColor: ACCENT_HEX,
      secondaryColor: "141b2c",
      iconColor: ACCENT_HEX,
      icons: "default",
      title: "true",
      poster: "true",
      autoplay: "true",
      player: "default",
    });
    if (resumeSeconds > 5) p.set("startAt", String(Math.floor(resumeSeconds)));
    if (mediaType === "tv") p.set("nextbutton", "true");
    return `${base}?${p.toString()}`;
  }

  const base =
    mediaType === "movie"
      ? `${VIDKING_BASE}/movie/${tmdbId}`
      : `${VIDKING_BASE}/tv/${tmdbId}/${season}/${episode}`;
  const p = new URLSearchParams({ color: ACCENT_HEX, autoPlay: "true" });
  if (mediaType === "tv") {
    p.set("nextEpisode", "true");
    p.set("episodeSelector", "true");
  }
  if (resumeSeconds > 5) p.set("progress", String(Math.floor(resumeSeconds)));
  return `${base}?${p.toString()}`;
}
