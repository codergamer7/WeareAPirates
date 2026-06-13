"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, Loader2, MonitorPlay, RefreshCw, SkipForward, TriangleAlert } from "lucide-react";
import {
  ACCENT_HEX,
  TWOEMBED_BASE,
  VIDKING_BASE,
  VIDLINK_BASE,
  VIDSYNC_BASE,
  type MediaType,
} from "@/lib/config";
import {
  PLAYER_PROVIDERS,
  PLAYER_PROVIDER_LABELS,
  type PlayerProvider,
} from "@/lib/player-provider";
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

// PLAYER_EVENT shape emitted by compatible embed iframes (Vidking).
interface PlayerEvent {
  type: "PLAYER_EVENT";
  data: {
    event: "timeupdate" | "play" | "pause" | "ended" | "seeked";
    currentTime: number;
    duration: number;
    progress: number;
  };
}

// How long to wait for the iframe to load at all before treating the server as
// unreachable, and (Vidking only) how long to wait for a playback heartbeat.
const LOAD_TIMEOUT = 12000;
const HEARTBEAT_TIMEOUT = 18000;

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
  const { provider, reloadNonce, reloadPlayer, setProvider } = usePlayerPreference();

  // Failover order: the user's/admin's provider first, then the rest.
  const order = useMemo(
    () => [provider, ...PLAYER_PROVIDERS.filter((p) => p !== provider)],
    [provider],
  );

  const [attempt, setAttempt] = useState(0);
  const activeProvider = order[Math.min(attempt, order.length - 1)];
  const [loaded, setLoaded] = useState(false);
  const [ready, setReady] = useState(false);
  const [exhausted, setExhausted] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [hint, setHint] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const loadedRef = useRef(false);
  const readyRef = useRef(false);
  const attemptRef = useRef(0);
  const orderRef = useRef(order);
  orderRef.current = order;
  attemptRef.current = attempt;

  const src = buildEmbedSrc({
    provider: activeProvider,
    mediaType,
    tmdbId,
    season,
    episode,
    resumeSeconds,
  });

  // Restart the failover cycle when the title or the chosen starting provider
  // changes (manual picks change `provider`, which resets us here).
  useEffect(() => {
    setAttempt(0);
    setExhausted(false);
    setNote(null);
  }, [provider, tmdbId, season, episode]);

  // Advance to the next provider in the order, or give up if exhausted.
  function advance(reason: string) {
    const ord = orderRef.current;
    const a = attemptRef.current;
    if (a + 1 < ord.length) {
      setNote(`${reason} — switching to ${PLAYER_PROVIDER_LABELS[ord[a + 1]]}…`);
      setAttempt(a + 1);
    } else {
      setExhausted(true);
      setNote(null);
    }
  }

  // Per-load health timers: skip unreachable servers automatically.
  useEffect(() => {
    setLoaded(false);
    setReady(false);
    loadedRef.current = false;
    readyRef.current = false;
    const ap = activeProvider;

    const loadTimer = setTimeout(() => {
      if (!loadedRef.current) advance("Server unreachable");
    }, LOAD_TIMEOUT);
    // Vidking reliably emits playback events; if it loaded but never plays,
    // it's a dead source. Other providers we don't second-guess on silence.
    const beatTimer = setTimeout(() => {
      if (loadedRef.current && !readyRef.current && ap === "vidking")
        advance("No playback");
    }, HEARTBEAT_TIMEOUT);

    return () => {
      clearTimeout(loadTimer);
      clearTimeout(beatTimer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [src, reloadNonce]);

  // Progress saving + playback heartbeat (marks the active source healthy).
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
      // first heartbeat → this source is alive
      if (!readyRef.current) {
        readyRef.current = true;
        setReady(true);
        setNote(null);
        setExhausted(false);
      }
      const { event, currentTime, duration } = evt.data;
      const force = event === "pause" || event === "ended" || event === "seeked";
      save(currentTime, duration, force);
    }

    window.addEventListener("message", onMessage);
    const onHide = () => (lastSaved.current = 0);
    window.addEventListener("beforeunload", onHide);
    return () => {
      window.removeEventListener("message", onMessage);
      window.removeEventListener("beforeunload", onHide);
    };
  }, [user, mediaType, tmdbId, season, episode, title, posterPath, backdropPath]);

  function handleLoad() {
    loadedRef.current = true;
    setLoaded(true);
    setNote(null);
  }

  function nextServer() {
    setExhausted(false);
    setNote(null);
    setAttempt((a) => (a + 1) % order.length);
  }

  function retry() {
    setExhausted(false);
    setNote(null);
    setAttempt(0);
    reloadPlayer();
  }

  function chooseServer(p: PlayerProvider) {
    setMenuOpen(false);
    setExhausted(false);
    setNote(null);
    setProvider(p); // persists their pick + resets the cycle to start here
  }

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
      <div className="group relative aspect-video w-full overflow-hidden rounded-2xl border border-border bg-black shadow-[0_30px_80px_rgba(0,0,0,0.6)]">
        <iframe
          key={`${src}-${reloadNonce}`}
          src={src}
          title={`${title} on ${activeProvider}`}
          onLoad={handleLoad}
          allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
          allowFullScreen
          className="absolute inset-0 h-full w-full"
        />
        {children}

        {/* top control strip — server picker (auto-hides; bottom stays clear
            for the embed's own controls) */}
        {!exhausted && (
          <div className="absolute inset-x-0 top-0 z-20 flex items-center justify-end gap-2 bg-gradient-to-b from-black/55 to-transparent p-2.5 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
            <button
              onClick={nextServer}
              className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur transition-colors hover:bg-white/20"
            >
              <SkipForward className="h-3.5 w-3.5" /> Next server
            </button>
            <div className="relative">
              <button
                onClick={() => setMenuOpen((m) => !m)}
                className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur transition-colors hover:bg-white/20"
              >
                <MonitorPlay className="h-3.5 w-3.5 text-accent" />
                {PLAYER_PROVIDER_LABELS[activeProvider]}
                <span className="text-white/50">
                  {Math.min(attempt + 1, order.length)}/{order.length}
                </span>
              </button>
              {menuOpen && (
                <div className="absolute right-0 top-10 w-44 overflow-hidden rounded-xl border border-border bg-surface p-1 shadow-2xl">
                  <p className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-muted">
                    Video server
                  </p>
                  {PLAYER_PROVIDERS.map((p) => (
                    <button
                      key={p}
                      onClick={() => chooseServer(p)}
                      className="flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-left text-sm transition-colors hover:bg-foreground/5"
                    >
                      {PLAYER_PROVIDER_LABELS[p]}
                      {p === activeProvider && <Check className="h-4 w-4 text-accent" />}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* loading current server */}
        {!loaded && !exhausted && (
          <div className="pointer-events-none absolute inset-0 z-10 grid place-items-center bg-black/55">
            <div className="text-center">
              <Loader2 className="mx-auto h-8 w-8 animate-spin text-accent" />
              <p className="mt-3 text-sm text-white/80">
                Loading {PLAYER_PROVIDER_LABELS[activeProvider]}…
              </p>
            </div>
          </div>
        )}

        {/* transient "switching" toast */}
        {note && !ready && loaded && (
          <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex justify-center p-3">
            <span className="rounded-full bg-black/75 px-3.5 py-1.5 text-xs font-medium text-white backdrop-blur">
              {note}
            </span>
          </div>
        )}

        {/* all servers tried */}
        {exhausted && (
          <div className="absolute inset-0 z-30 grid place-items-center bg-black/80 p-6 text-center backdrop-blur-sm">
            <div className="max-w-sm">
              <span className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-2xl bg-amber-500/15 text-amber-400">
                <TriangleAlert className="h-6 w-6" />
              </span>
              <p className="font-display text-lg font-bold text-white">
                Couldn’t find a working server
              </p>
              <p className="mt-1 text-sm text-white/70">
                Every source was tried. Retry, or pick one manually.
              </p>
              <div className="mt-4 flex flex-wrap justify-center gap-2">
                <button
                  onClick={retry}
                  className="inline-flex items-center gap-2 rounded-full bg-accent px-5 py-2.5 text-sm font-bold text-accent-foreground transition-transform hover:scale-105 active:scale-95"
                >
                  <RefreshCw className="h-4 w-4" /> Retry all
                </button>
                {PLAYER_PROVIDERS.map((p) => (
                  <button
                    key={p}
                    onClick={() => chooseServer(p)}
                    className="rounded-full border border-white/20 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:border-accent hover:text-accent"
                  >
                    {PLAYER_PROVIDER_LABELS[p]}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
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

  if (provider === "2embed") {
    // 2embed.cc: movie -> /embed/{tmdb}; tv -> /embedtv/{tmdb}&s=&e=
    return mediaType === "movie"
      ? `${TWOEMBED_BASE}/embed/${tmdbId}`
      : `${TWOEMBED_BASE}/embedtv/${tmdbId}&s=${season ?? 1}&e=${episode ?? 1}`;
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
