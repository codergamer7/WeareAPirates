"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import {
  Check,
  ChevronLeft,
  Copy,
  Crown,
  RefreshCw,
  Search,
  Send,
  Users,
} from "lucide-react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import type { TmdbItem } from "@/lib/types";
import type { MediaType } from "@/lib/config";
import { getDetail, mediaKind, mediaTitle, searchMulti } from "@/lib/tmdb";
import { clock } from "@/lib/utils";
import { useAuth } from "@/lib/auth-context";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { VidkingPlayer } from "@/components/player/VidkingPlayer";

interface NowPlaying {
  mediaType: MediaType;
  tmdbId: number;
  season: number;
  episode: number;
  title: string;
  posterPath: string | null;
  backdropPath: string | null;
  at?: number; // host position when (re)broadcast — used for late joiners
}

interface Viewer {
  id: string;
  name: string;
  isHost: boolean;
}

interface ChatMsg {
  id: string;
  name: string;
  text: string;
  self: boolean;
}

// Parse a Vidking PLAYER_EVENT postMessage (string or object).
function parsePlayerEvent(data: unknown):
  | { event: string; currentTime: number; duration: number }
  | null {
  let payload: unknown = data;
  if (typeof payload === "string") {
    try {
      payload = JSON.parse(payload);
    } catch {
      return null;
    }
  }
  const p = payload as {
    type?: string;
    data?: { event: string; currentTime: number; duration: number };
  };
  if (p?.type !== "PLAYER_EVENT" || !p.data) return null;
  return p.data;
}

export function PartyRoom({ code }: { code: string }) {
  const { user, profile } = useAuth();
  const params = useSearchParams();
  const isHost = params.get("host") === "1";

  const name = profile?.display_name || profile?.email?.split("@")[0] || "Guest";

  const [connected, setConnected] = useState(false);
  const [nowPlaying, setNowPlaying] = useState<NowPlaying | null>(null);
  const [viewers, setViewers] = useState<Viewer[]>([]);
  const [chat, setChat] = useState<ChatMsg[]>([]);
  const [draft, setDraft] = useState("");
  const [copied, setCopied] = useState(false);
  const [playerNonce, setPlayerNonce] = useState(0);
  const [resumeAt, setResumeAt] = useState(0);
  const [hostTime, setHostTime] = useState(0);
  const [hostPaused, setHostPaused] = useState(false);

  // host content picker
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<TmdbItem[]>([]);
  const [searching, setSearching] = useState(false);

  const channelRef = useRef<RealtimeChannel | null>(null);
  const nowPlayingRef = useRef<NowPlaying | null>(null);
  const hostTimeRef = useRef(0);
  const hostPausedRef = useRef(false);
  const lastSent = useRef(0);
  const chatEnd = useRef<HTMLDivElement>(null);

  nowPlayingRef.current = nowPlaying;

  // ---- Realtime channel ----
  useEffect(() => {
    const sb = createSupabaseBrowserClient();
    if (!sb || !user) return;

    const channel = sb.channel(`party-${code}`, {
      config: { broadcast: { self: false }, presence: { key: user.id } },
    });
    channelRef.current = channel;

    const syncViewers = () => {
      const state = channel.presenceState() as Record<
        string,
        { name: string; isHost: boolean }[]
      >;
      const list: Viewer[] = Object.entries(state).map(([id, metas]) => ({
        id,
        name: metas[0]?.name ?? "Guest",
        isHost: !!metas[0]?.isHost,
      }));
      setViewers(list);
    };

    channel
      .on("broadcast", { event: "now_playing" }, ({ payload }) => {
        const np = payload as NowPlaying;
        setNowPlaying(np);
        setResumeAt(Math.floor(np.at ?? 0));
        setPlayerNonce((n) => n + 1);
      })
      .on("broadcast", { event: "progress" }, ({ payload }) => {
        const { t, paused } = payload as { t: number; paused: boolean };
        hostTimeRef.current = t;
        hostPausedRef.current = paused;
        setHostTime(t);
        setHostPaused(paused);
      })
      .on("broadcast", { event: "chat" }, ({ payload }) => {
        const m = payload as { id: string; name: string; text: string };
        setChat((c) => [...c, { ...m, self: false }].slice(-200));
      })
      .on("broadcast", { event: "request_state" }, () => {
        // Only the host answers, re-sending current content + position.
        if (isHost && nowPlayingRef.current) {
          channel.send({
            type: "broadcast",
            event: "now_playing",
            payload: { ...nowPlayingRef.current, at: hostTimeRef.current },
          });
        }
      })
      .on("presence", { event: "sync" }, syncViewers)
      .subscribe(async (status) => {
        if (status !== "SUBSCRIBED") return;
        setConnected(true);
        await channel.track({ name, isHost });
        if (!isHost)
          channel.send({ type: "broadcast", event: "request_state", payload: {} });
      });

    return () => {
      sb.removeChannel(channel);
      channelRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code, user?.id]);

  // ---- Host: broadcast playback position from the player's postMessages ----
  useEffect(() => {
    if (!isHost) return;
    function onMessage(e: MessageEvent) {
      const data = parsePlayerEvent(e.data);
      if (!data) return;
      const paused = data.event === "pause";
      hostTimeRef.current = data.currentTime;
      hostPausedRef.current = paused;
      const force =
        data.event === "pause" ||
        data.event === "play" ||
        data.event === "seeked" ||
        data.event === "ended";
      const now = Date.now();
      if (!force && now - lastSent.current < 2500) return;
      lastSent.current = now;
      channelRef.current?.send({
        type: "broadcast",
        event: "progress",
        payload: { t: data.currentTime, paused },
      });
    }
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [isHost]);

  // autoscroll chat
  useEffect(() => {
    chatEnd.current?.scrollIntoView({ behavior: "smooth" });
  }, [chat.length]);

  const setContent = useCallback(
    (np: NowPlaying) => {
      setNowPlaying(np);
      setResumeAt(0);
      setPlayerNonce((n) => n + 1);
      hostTimeRef.current = 0;
      channelRef.current?.send({
        type: "broadcast",
        event: "now_playing",
        payload: { ...np, at: 0 },
      });
    },
    [],
  );

  async function pick(item: TmdbItem) {
    const kind = mediaKind(item);
    const title = mediaTitle(item);
    if (kind === "movie") {
      setContent({
        mediaType: "movie",
        tmdbId: item.id,
        season: 0,
        episode: 0,
        title,
        posterPath: item.poster_path,
        backdropPath: item.backdrop_path,
      });
    } else {
      // start at the first real season
      const detail = await getDetail("tv", item.id).catch(() => null);
      const firstSeason =
        detail?.seasons?.find(
          (s: { season_number: number; episode_count: number }) =>
            s.season_number >= 1 && s.episode_count > 0,
        )?.season_number ?? 1;
      setContent({
        mediaType: "tv",
        tmdbId: item.id,
        season: firstSeason,
        episode: 1,
        title,
        posterPath: item.poster_path,
        backdropPath: item.backdrop_path,
      });
    }
    setResults([]);
    setQuery("");
  }

  function stepEpisode(delta: number) {
    if (!nowPlaying || nowPlaying.mediaType !== "tv") return;
    const episode = Math.max(1, nowPlaying.episode + delta);
    setContent({ ...nowPlaying, episode });
  }

  async function runSearch(q: string) {
    setQuery(q);
    if (q.trim().length < 2) {
      setResults([]);
      return;
    }
    setSearching(true);
    try {
      const r = await searchMulti(q.trim());
      setResults(
        r.results
          .filter((x) => x.media_type !== "person" && x.poster_path)
          .slice(0, 8),
      );
    } finally {
      setSearching(false);
    }
  }

  function sendChat() {
    const text = draft.trim();
    if (!text) return;
    const msg = { id: crypto.randomUUID(), name, text };
    channelRef.current?.send({ type: "broadcast", event: "chat", payload: msg });
    setChat((c) => [...c, { ...msg, self: true }].slice(-200));
    setDraft("");
  }

  function catchUp() {
    setResumeAt(Math.floor(hostTimeRef.current));
    setPlayerNonce((n) => n + 1);
  }

  function copyInvite() {
    const url = `${window.location.origin}/party/${code}`;
    navigator.clipboard?.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    });
  }

  const hostViewer = useMemo(() => viewers.find((v) => v.isHost), [viewers]);

  if (!user) return null;

  return (
    <div className="min-h-screen pb-16">
      {/* top bar */}
      <div className="sticky top-0 z-30 glass border-b">
        <div className="mx-auto flex h-16 max-w-[1600px] items-center gap-3 px-4 sm:px-8">
          <Link
            href="/party"
            className="flex items-center gap-1.5 text-sm font-medium text-muted transition-colors hover:text-foreground"
          >
            <ChevronLeft className="h-5 w-5" /> Leave
          </Link>
          <div className="ml-1 flex items-center gap-2">
            <span className="text-xs text-muted">Room</span>
            <span className="rounded-lg bg-foreground/10 px-2.5 py-1 font-mono text-sm font-bold tracking-[0.25em]">
              {code}
            </span>
            <button
              onClick={copyInvite}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1 text-xs font-semibold text-muted transition-colors hover:text-accent"
            >
              {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              {copied ? "Copied" : "Invite"}
            </button>
          </div>
          <div className="ml-auto flex items-center gap-2 text-sm text-muted">
            <Users className="h-4 w-4" />
            {viewers.length || 1}
            <span
              className={`ml-1 h-2 w-2 rounded-full ${connected ? "bg-emerald-400" : "bg-amber-400"}`}
              title={connected ? "Connected" : "Connecting…"}
            />
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-[1600px] px-4 pt-6 sm:px-8">
        <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
          {/* ---- stage ---- */}
          <div>
            {nowPlaying ? (
              <>
                <VidkingPlayer
                  key={playerNonce}
                  mediaType={nowPlaying.mediaType}
                  tmdbId={nowPlaying.tmdbId}
                  season={nowPlaying.season || undefined}
                  episode={nowPlaying.episode || undefined}
                  resumeSeconds={resumeAt}
                  title={nowPlaying.title}
                  posterPath={nowPlaying.posterPath}
                  backdropPath={nowPlaying.backdropPath}
                />

                <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                  <div className="min-w-0">
                    <h1 className="truncate font-display text-xl font-bold tracking-tight">
                      {nowPlaying.title}
                    </h1>
                    {nowPlaying.mediaType === "tv" && (
                      <p className="text-xs text-muted">
                        S{nowPlaying.season} · E{nowPlaying.episode}
                      </p>
                    )}
                  </div>

                  {isHost ? (
                    nowPlaying.mediaType === "tv" && (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => stepEpisode(-1)}
                          className="rounded-full border border-border px-3 py-1.5 text-xs font-semibold transition-colors hover:border-accent hover:text-accent"
                        >
                          ‹ Ep
                        </button>
                        <button
                          onClick={() => stepEpisode(1)}
                          className="rounded-full border border-border px-3 py-1.5 text-xs font-semibold transition-colors hover:border-accent hover:text-accent"
                        >
                          Ep ›
                        </button>
                      </div>
                    )
                  ) : (
                    <button
                      onClick={catchUp}
                      className="inline-flex items-center gap-2 rounded-full bg-accent px-4 py-2 text-xs font-bold text-accent-foreground transition-transform hover:scale-105"
                    >
                      <RefreshCw className="h-3.5 w-3.5" />
                      Sync to host · {clock(hostTime)}
                      {hostPaused && <span className="opacity-70">(paused)</span>}
                    </button>
                  )}
                </div>

                {!isHost && (
                  <p className="mt-2 text-xs text-muted">
                    The host controls playback. Use{" "}
                    <span className="text-accent">Sync to host</span> to jump to their
                    spot.
                  </p>
                )}
              </>
            ) : (
              <div className="grid aspect-video w-full place-items-center rounded-2xl border border-dashed border-border bg-surface/40 text-center">
                <div className="px-6">
                  <Crown className="mx-auto mb-3 h-8 w-8 text-accent" />
                  <p className="font-display text-lg font-semibold">
                    {isHost ? "Pick something to watch" : "Waiting for the host…"}
                  </p>
                  <p className="mt-1 text-sm text-muted">
                    {isHost
                      ? "Search below and it starts for everyone in the room."
                      : hostViewer
                        ? `${hostViewer.name} is choosing a title.`
                        : "No host is connected yet."}
                  </p>
                </div>
              </div>
            )}

            {/* host search */}
            {isHost && (
              <div className="mt-5">
                <div className="flex items-center gap-2 rounded-xl border border-border bg-surface/50 px-3.5 py-2.5">
                  <Search className="h-4 w-4 text-muted" />
                  <input
                    value={query}
                    onChange={(e) => runSearch(e.target.value)}
                    placeholder="Search films & series to play…"
                    className="w-full bg-transparent text-sm outline-none placeholder:text-muted/60"
                  />
                  {searching && (
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent text-muted" />
                  )}
                </div>
                {results.length > 0 && (
                  <div className="mt-3 grid grid-cols-3 gap-3 sm:grid-cols-4">
                    {results.map((item) => (
                      <button
                        key={item.id}
                        onClick={() => pick(item)}
                        className="group/p text-left"
                      >
                        <div className="relative aspect-[2/3] overflow-hidden rounded-lg border border-border bg-surface-2 transition-all group-hover/p:-translate-y-1 group-hover/p:ring-1 group-hover/p:ring-accent">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={`https://image.tmdb.org/t/p/w342${item.poster_path}`}
                            alt={mediaTitle(item)}
                            loading="lazy"
                            className="h-full w-full object-cover"
                          />
                        </div>
                        <p className="mt-1 truncate text-xs font-medium">
                          {mediaTitle(item)}
                        </p>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ---- side panel: viewers + chat ---- */}
          <div className="flex max-h-[calc(100vh-7rem)] flex-col gap-4 lg:sticky lg:top-24">
            <div className="rounded-2xl border border-border bg-surface/40 p-4">
              <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold">
                <Users className="h-4 w-4 text-accent" /> In the room
              </h2>
              <div className="flex flex-wrap gap-2">
                {viewers.map((v) => (
                  <span
                    key={v.id}
                    className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface-2/60 px-2.5 py-1 text-xs"
                  >
                    <span className="grid h-5 w-5 place-items-center rounded-full bg-gradient-to-br from-accent-bright to-accent text-[10px] font-bold text-accent-foreground">
                      {v.name.charAt(0).toUpperCase()}
                    </span>
                    {v.name}
                    {v.isHost && <Crown className="h-3 w-3 text-accent" />}
                  </span>
                ))}
                {!viewers.length && (
                  <span className="text-xs text-muted">Just you so far.</span>
                )}
              </div>
            </div>

            <div className="flex min-h-[320px] flex-1 flex-col rounded-2xl border border-border bg-surface/40">
              <h2 className="border-b border-border px-4 py-3 text-sm font-semibold">
                Chat
              </h2>
              <div className="flex-1 space-y-2.5 overflow-y-auto px-4 py-3">
                {chat.length === 0 && (
                  <p className="text-xs text-muted">
                    Say hi 👋 — messages are shared with everyone here.
                  </p>
                )}
                {chat.map((m) => (
                  <motion.div
                    key={m.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex flex-col ${m.self ? "items-end" : "items-start"}`}
                  >
                    <span className="px-1 text-[10px] text-muted">{m.name}</span>
                    <span
                      className={`max-w-[85%] rounded-2xl px-3 py-1.5 text-sm ${
                        m.self
                          ? "bg-accent text-accent-foreground"
                          : "bg-surface-2 text-foreground"
                      }`}
                    >
                      {m.text}
                    </span>
                  </motion.div>
                ))}
                <div ref={chatEnd} />
              </div>
              <div className="flex items-center gap-2 border-t border-border p-3">
                <input
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && sendChat()}
                  placeholder="Message…"
                  className="w-full rounded-full border border-border bg-surface-2/60 px-4 py-2 text-sm outline-none focus:border-accent"
                />
                <button
                  onClick={sendChat}
                  disabled={!draft.trim()}
                  className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-accent text-accent-foreground transition-transform hover:scale-105 disabled:opacity-40"
                >
                  <Send className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
