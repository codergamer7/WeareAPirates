"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  CalendarClock,
  CirclePlay,
  Flame,
  Loader2,
  Radio,
  RefreshCw,
  Search,
  ShieldQuestion,
  Trophy,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Sport {
  id: string;
  name: string;
}

interface Team {
  name: string;
  badge?: string;
}

interface StreamedMatch {
  id: string;
  title: string;
  category: string;
  date: number;
  poster?: string;
  popular: boolean;
  teams?: { home?: Team; away?: Team };
  sources: { source: string; id: string }[];
}

interface Stream {
  id: string;
  streamNo: number;
  language: string;
  hd: boolean;
  embedUrl: string;
  source: string;
}

const STREAMED = "https://streamed.pk";
const FEATURED_FILTERS = [
  { id: "live", name: "Live", icon: Radio },
  { id: "all-today", name: "Today", icon: CalendarClock },
];

// Build a usable image URL from the API's relative/absolute references.
function streamedImg(path?: string, kind: "poster" | "badge" = "poster") {
  if (!path) return null;
  if (path.startsWith("http")) return path;
  if (path.startsWith("/")) return `${STREAMED}${path}`;
  return `${STREAMED}/api/images/${kind}/${path}.webp`;
}

type Status = { label: string; tone: "live" | "soon" | "upcoming" | "progress" | "ended" };

function matchStatus(match: StreamedMatch, live: Set<string>): Status {
  if (live.has(match.id)) return { label: "LIVE", tone: "live" };
  const now = Date.now();
  if (!match.date) return { label: "TBA", tone: "upcoming" };
  const diff = match.date - now;
  if (diff > 0) {
    const h = Math.floor(diff / 3_600_000);
    const m = Math.floor((diff % 3_600_000) / 60_000);
    if (diff < 3_600_000) return { label: `in ${m}m`, tone: "soon" };
    if (diff < 86_400_000) return { label: `in ${h}h ${m}m`, tone: "upcoming" };
    return { label: formatMatchDate(match.date), tone: "upcoming" };
  }
  // started already but not in the live set
  if (now - match.date < 3 * 3_600_000) return { label: "In progress", tone: "progress" };
  return { label: "Ended", tone: "ended" };
}

export default function SportsPage() {
  const [sports, setSports] = useState<Sport[]>([]);
  const [active, setActive] = useState("live");
  const [matches, setMatches] = useState<StreamedMatch[]>([]);
  const [liveIds, setLiveIds] = useState<Set<string>>(new Set());
  const [query, setQuery] = useState("");
  const [loadingSports, setLoadingSports] = useState(true);
  const [loadingMatches, setLoadingMatches] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [selected, setSelected] = useState<StreamedMatch | null>(null);
  const [streams, setStreams] = useState<Stream[]>([]);
  const [activeStream, setActiveStream] = useState<Stream | null>(null);
  const [loadingStreams, setLoadingStreams] = useState(false);
  const [playerNonce, setPlayerNonce] = useState(0);

  // ---- sport list ----
  useEffect(() => {
    let on = true;
    fetch("/api/streamed/sports")
      .then((r) => r.json())
      .then((d) => on && Array.isArray(d) && setSports(d))
      .catch(() => undefined)
      .finally(() => on && setLoadingSports(false));
    return () => {
      on = false;
    };
  }, []);

  // ---- live id set (for badging across every filter), refreshed periodically ----
  const loadLive = useCallback(() => {
    fetch("/api/streamed/matches/live")
      .then((r) => r.json())
      .then((d: StreamedMatch[]) => {
        if (Array.isArray(d)) setLiveIds(new Set(d.map((m) => m.id)));
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    loadLive();
    const t = setInterval(loadLive, 60_000);
    return () => clearInterval(t);
  }, [loadLive]);

  // ---- matches for the active filter ----
  const endpoint = useMemo(() => {
    if (active === "live") return "matches/live";
    if (active === "all-today") return "matches/all-today";
    return `matches/${active}`;
  }, [active]);

  const loadMatches = useCallback(
    (silent = false) => {
      if (silent) setRefreshing(true);
      else setLoadingMatches(true);
      fetch(`/api/streamed/${endpoint}`)
        .then((r) => r.json())
        .then((d) => setMatches(Array.isArray(d) ? d : []))
        .catch(() => setMatches([]))
        .finally(() => {
          setLoadingMatches(false);
          setRefreshing(false);
        });
    },
    [endpoint],
  );

  useEffect(() => {
    loadMatches();
  }, [loadMatches]);

  // auto-refresh the Live tab
  const liveTab = active === "live";
  const loadRef = useRef(loadMatches);
  loadRef.current = loadMatches;
  useEffect(() => {
    if (!liveTab) return;
    const t = setInterval(() => loadRef.current(true), 60_000);
    return () => clearInterval(t);
  }, [liveTab]);

  function chooseFilter(id: string) {
    if (id === active) return;
    setQuery("");
    setActive(id);
  }

  async function openMatch(match: StreamedMatch) {
    setSelected(match);
    setStreams([]);
    setActiveStream(null);
    setLoadingStreams(true);
    setPlayerNonce((n) => n + 1);

    const sources = match.sources ?? [];
    const lists = await Promise.all(
      sources.map((s) =>
        fetch(`/api/streamed/stream/${s.source}/${s.id}`)
          .then((r) => (r.ok ? r.json() : []))
          .catch(() => []),
      ),
    );
    const seen = new Set<string>();
    const merged = (lists.flat() as Stream[])
      .filter((x) => x && x.embedUrl && !seen.has(x.embedUrl) && seen.add(x.embedUrl))
      .sort((a, b) => Number(b.hd) - Number(a.hd) || a.streamNo - b.streamNo);

    setStreams(merged);
    setActiveStream(merged[0] ?? null);
    setLoadingStreams(false);
  }

  function closeMatch() {
    setSelected(null);
    setStreams([]);
    setActiveStream(null);
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = q
      ? matches.filter(
          (m) =>
            m.title.toLowerCase().includes(q) ||
            m.teams?.home?.name.toLowerCase().includes(q) ||
            m.teams?.away?.name.toLowerCase().includes(q),
        )
      : matches;
    // live first, then by start time
    return [...list].sort((a, b) => {
      const al = liveIds.has(a.id) ? 1 : 0;
      const bl = liveIds.has(b.id) ? 1 : 0;
      return bl - al || (a.date || 0) - (b.date || 0);
    });
  }, [matches, query, liveIds]);

  const popular = useMemo(
    () => filtered.filter((m) => m.popular).slice(0, 12),
    [filtered],
  );

  const filterLabel = useMemo(() => {
    if (active === "live") return "Live Now";
    if (active === "all-today") return "Today's Events";
    return sports.find((s) => s.id === active)?.name ?? "Sports";
  }, [active, sports]);

  return (
    <div className="min-h-screen pb-20 pt-24">
      <div className="mx-auto max-w-[1500px] px-4 sm:px-8">
        {/* header */}
        <div className="flex flex-col gap-5">
          <div className="flex items-center gap-3">
            <span className="grid h-12 w-12 place-items-center rounded-2xl bg-accent/10 text-accent ring-1 ring-accent/30">
              <Trophy className="h-6 w-6" />
            </span>
            <div className="flex-1">
              <h1 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
                Sports
              </h1>
              <p className="flex items-center gap-2 text-sm text-muted">
                Live events from Streamed
                {liveTab && (
                  <span className="inline-flex items-center gap-1 text-xs text-emerald-400">
                    <span className="relative flex h-1.5 w-1.5">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                      <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
                    </span>
                    auto-updating
                  </span>
                )}
              </p>
            </div>
            <button
              onClick={() => loadMatches(true)}
              className="hidden items-center gap-2 rounded-full border border-border px-3.5 py-2 text-sm font-semibold text-muted transition-colors hover:border-accent/50 hover:text-foreground sm:inline-flex"
            >
              <RefreshCw className={cn("h-4 w-4", refreshing && "animate-spin")} />
              Refresh
            </button>
          </div>

          {/* search */}
          <div className="flex items-center gap-2 rounded-xl border border-border bg-surface/50 px-3.5 py-2.5">
            <Search className="h-4 w-4 text-muted" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search teams or events…"
              className="w-full bg-transparent text-sm outline-none placeholder:text-muted/60"
            />
            {query && (
              <button onClick={() => setQuery("")} className="text-muted hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* filters */}
          <div className="row-scroll flex gap-2 overflow-x-auto pb-1">
            {FEATURED_FILTERS.map(({ id, name, icon: Icon }) => (
              <FilterButton key={id} active={active === id} onClick={() => chooseFilter(id)}>
                <Icon className="h-4 w-4" /> {name}
              </FilterButton>
            ))}
            {loadingSports ? (
              <span className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm text-muted">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading
              </span>
            ) : (
              sports.map((s) => (
                <FilterButton key={s.id} active={active === s.id} onClick={() => chooseFilter(s.id)}>
                  {s.name}
                </FilterButton>
              ))
            )}
          </div>
        </div>

        {/* popular strip */}
        {!loadingMatches && popular.length > 2 && !query && (
          <section className="mt-8">
            <h2 className="mb-3 flex items-center gap-2 font-display text-xl font-bold">
              <Flame className="h-5 w-5 text-accent" /> Popular now
            </h2>
            <div className="row-scroll flex gap-3 overflow-x-auto pb-2">
              {popular.map((m) => (
                <FeaturedCard
                  key={m.id}
                  match={m}
                  status={matchStatus(m, liveIds)}
                  onClick={() => openMatch(m)}
                />
              ))}
            </div>
          </section>
        )}

        {/* main grid */}
        <div className="mt-8 flex items-center justify-between gap-4">
          <div>
            <h2 className="font-display text-2xl font-bold">{filterLabel}</h2>
            <p className="text-sm text-muted">
              {filtered.length} {filtered.length === 1 ? "event" : "events"}
            </p>
          </div>
        </div>

        {loadingMatches ? (
          <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 9 }).map((_, i) => (
              <div key={i} className="shimmer h-40 rounded-2xl" />
            ))}
          </div>
        ) : filtered.length ? (
          <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {filtered.map((match, i) => (
              <MatchCard
                key={`${match.id}-${i}`}
                match={match}
                status={matchStatus(match, liveIds)}
                index={i}
                onClick={() => openMatch(match)}
              />
            ))}
          </div>
        ) : (
          <div className="mt-5 grid place-items-center rounded-2xl border border-dashed border-border py-16 text-center text-muted">
            <div>
              <ShieldQuestion className="mx-auto mb-3 h-8 w-8" />
              <p>{query ? "No events match your search." : "No events found for this filter."}</p>
            </div>
          </div>
        )}
      </div>

      {/* player modal */}
      <AnimatePresence>
        {selected && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeMatch}
            className="fixed inset-0 z-50 grid place-items-center bg-black/85 p-3 backdrop-blur-sm sm:p-4"
          >
            <motion.div
              initial={{ scale: 0.96, opacity: 0, y: 14 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.96, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-6xl overflow-hidden rounded-2xl border border-border bg-surface shadow-2xl"
            >
              {/* header */}
              <div className="flex items-center gap-3 border-b border-border px-4 py-3">
                {liveIds.has(selected.id) && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-red-500 px-2.5 py-1 text-[11px] font-bold text-white">
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" /> LIVE
                  </span>
                )}
                <div className="min-w-0 flex-1">
                  <h2 className="truncate font-display text-lg font-bold">{selected.title}</h2>
                  <p className="text-xs text-muted">
                    {selected.category} · {formatMatchDate(selected.date)}
                  </p>
                </div>
                {activeStream && (
                  <button
                    onClick={() => setPlayerNonce((n) => n + 1)}
                    title="Reload stream"
                    className="grid h-9 w-9 place-items-center rounded-full text-muted transition-colors hover:bg-foreground/10 hover:text-foreground"
                  >
                    <RefreshCw className="h-4 w-4" />
                  </button>
                )}
                <button
                  onClick={closeMatch}
                  className="grid h-9 w-9 place-items-center rounded-full text-muted transition-colors hover:bg-foreground/10 hover:text-foreground"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="grid gap-0 lg:grid-cols-[1fr_280px]">
                <div className="relative aspect-video bg-black">
                  {loadingStreams ? (
                    <div className="absolute inset-0 grid place-items-center text-muted">
                      <Loader2 className="h-7 w-7 animate-spin" />
                    </div>
                  ) : activeStream ? (
                    <iframe
                      key={`${activeStream.embedUrl}-${playerNonce}`}
                      src={activeStream.embedUrl}
                      title={selected.title}
                      allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
                      allowFullScreen
                      referrerPolicy="origin"
                      className="absolute inset-0 h-full w-full"
                    />
                  ) : (
                    <div className="absolute inset-0 grid place-items-center px-5 text-center text-muted">
                      No playable stream is available right now.
                    </div>
                  )}
                </div>

                <aside className="border-t border-border p-3 lg:border-l lg:border-t-0">
                  <div className="mb-2 flex items-center justify-between px-1">
                    <p className="text-xs font-semibold uppercase text-muted">
                      Streams
                    </p>
                    {streams.length > 0 && (
                      <span className="text-[11px] text-muted">{streams.length} sources</span>
                    )}
                  </div>
                  <div className="max-h-72 space-y-2 overflow-y-auto pr-1 lg:max-h-[460px]">
                    {streams.map((stream) => (
                      <button
                        key={stream.id}
                        onClick={() => {
                          setActiveStream(stream);
                          setPlayerNonce((n) => n + 1);
                        }}
                        className={cn(
                          "flex w-full items-center justify-between gap-2 rounded-xl border px-3 py-2 text-left text-sm transition-colors",
                          activeStream?.id === stream.id
                            ? "border-accent bg-accent/12 text-foreground"
                            : "border-border text-muted hover:text-foreground",
                        )}
                      >
                        <span className="min-w-0">
                          <span className="block truncate font-semibold capitalize">
                            {stream.source} · #{stream.streamNo}
                          </span>
                          <span className="block text-xs text-muted">
                            {stream.language || "Unknown"}
                          </span>
                        </span>
                        <span
                          className={cn(
                            "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold",
                            stream.hd ? "bg-accent/20 text-accent" : "bg-foreground/10 text-muted",
                          )}
                        >
                          {stream.hd ? "HD" : "SD"}
                        </span>
                      </button>
                    ))}
                    {!loadingStreams && streams.length === 0 && (
                      <p className="px-1 py-3 text-xs text-muted">
                        No streams listed for this event yet.
                      </p>
                    )}
                  </div>
                  {streams.length > 1 && (
                    <p className="mt-3 px-1 text-[11px] leading-relaxed text-muted">
                      Stream offline or buffering? Pick another source above.
                    </p>
                  )}
                </aside>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ---------- cards ---------- */

function FeaturedCard({
  match,
  status,
  onClick,
}: {
  match: StreamedMatch;
  status: Status;
  onClick: () => void;
}) {
  const poster = streamedImg(match.poster);
  return (
    <button
      onClick={onClick}
      className="group relative h-40 w-72 shrink-0 overflow-hidden rounded-2xl border border-border bg-surface-2 text-left"
    >
      {poster ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={poster}
          alt={match.title}
          loading="lazy"
          className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
      ) : (
        <TeamCollage match={match} />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-black/10" />
      <div className="absolute left-3 top-3">
        <StatusPill status={status} />
      </div>
      <div className="absolute inset-x-0 bottom-0 p-3">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-white/70">
          {match.category}
        </p>
        <h3 className="line-clamp-2 font-display text-base font-bold text-white drop-shadow">
          {match.title}
        </h3>
      </div>
      <span className="absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-full bg-accent/90 text-accent-foreground opacity-0 transition-opacity group-hover:opacity-100">
        <CirclePlay className="h-5 w-5" />
      </span>
    </button>
  );
}

function MatchCard({
  match,
  status,
  index,
  onClick,
}: {
  match: StreamedMatch;
  status: Status;
  index: number;
  onClick: () => void;
}) {
  const hasTeams = !!(match.teams?.home || match.teams?.away);
  return (
    <motion.button
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: Math.min(index * 0.02, 0.2) }}
      onClick={onClick}
      className="group flex flex-col justify-between gap-4 rounded-2xl border border-border bg-surface/45 p-4 text-left transition-all hover:-translate-y-0.5 hover:border-accent/50 hover:bg-surface/70"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <StatusPill status={status} />
          <span className="rounded-full bg-foreground/8 px-2 py-0.5 text-[11px] font-bold capitalize text-muted">
            {match.category}
          </span>
          {match.popular && (
            <span className="inline-flex items-center gap-1 rounded-full bg-accent/15 px-2 py-0.5 text-[11px] font-bold text-accent">
              <Flame className="h-3 w-3" /> Popular
            </span>
          )}
        </div>
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-accent text-accent-foreground transition-transform group-hover:scale-110">
          <CirclePlay className="h-5 w-5" />
        </span>
      </div>

      {hasTeams ? (
        <div className="flex items-center justify-between gap-2">
          <TeamSide team={match.teams?.home} />
          <span className="shrink-0 font-display text-xs font-bold text-muted">VS</span>
          <TeamSide team={match.teams?.away} align="right" />
        </div>
      ) : (
        <h3 className="line-clamp-2 font-display text-lg font-bold leading-tight">
          {match.title}
        </h3>
      )}
    </motion.button>
  );
}

function TeamSide({ team, align = "left" }: { team?: Team; align?: "left" | "right" }) {
  if (!team) return <div className="flex-1" />;
  const badge = streamedImg(team.badge, "badge");
  return (
    <div
      className={cn(
        "flex min-w-0 flex-1 items-center gap-2",
        align === "right" && "flex-row-reverse text-right",
      )}
    >
      <span className="grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-full bg-surface-2 ring-1 ring-border">
        {badge ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={badge} alt="" loading="lazy" className="h-8 w-8 object-contain" />
        ) : (
          <Trophy className="h-4 w-4 text-muted" />
        )}
      </span>
      <span className="truncate text-sm font-semibold">{team.name}</span>
    </div>
  );
}

function TeamCollage({ match }: { match: StreamedMatch }) {
  const home = streamedImg(match.teams?.home?.badge, "badge");
  const away = streamedImg(match.teams?.away?.badge, "badge");
  return (
    <div className="absolute inset-0 flex items-center justify-center gap-6 bg-gradient-to-br from-surface-2 to-surface">
      {[home, away].map((b, i) =>
        b ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img key={i} src={b} alt="" className="h-16 w-16 object-contain opacity-90" />
        ) : (
          <Trophy key={i} className="h-12 w-12 text-muted/40" />
        ),
      )}
    </div>
  );
}

function StatusPill({ status }: { status: Status }) {
  const tones: Record<Status["tone"], string> = {
    live: "bg-red-500 text-white",
    progress: "bg-amber-500/20 text-amber-400",
    soon: "bg-accent/20 text-accent",
    upcoming: "bg-foreground/8 text-muted",
    ended: "bg-foreground/8 text-muted",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-bold",
        tones[status.tone],
      )}
    >
      {status.tone === "live" && (
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" />
      )}
      {status.label}
    </span>
  );
}

function FilterButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "inline-flex shrink-0 items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition-colors",
        active
          ? "border-accent bg-accent text-accent-foreground"
          : "border-border bg-surface/40 text-muted hover:border-accent/40 hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}

function formatMatchDate(date: number) {
  if (!date) return "Time TBA";
  return new Intl.DateTimeFormat(undefined, {
    weekday: "short",
    hour: "numeric",
    minute: "2-digit",
    month: "short",
    day: "numeric",
  }).format(new Date(date));
}
