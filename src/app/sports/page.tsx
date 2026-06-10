"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  CalendarClock,
  CirclePlay,
  Loader2,
  Radio,
  ShieldQuestion,
  Sparkles,
  Trophy,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Sport {
  id: string;
  name: string;
}

interface StreamedMatch {
  id: string;
  title: string;
  category: string;
  date: number;
  poster?: string;
  popular: boolean;
  teams?: {
    home?: { name: string; badge: string };
    away?: { name: string; badge: string };
  };
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

export default function SportsPage() {
  const [sports, setSports] = useState<Sport[]>([]);
  const [active, setActive] = useState("live");
  const [matches, setMatches] = useState<StreamedMatch[]>([]);
  const [loadingSports, setLoadingSports] = useState(true);
  const [loadingMatches, setLoadingMatches] = useState(true);
  const [selected, setSelected] = useState<StreamedMatch | null>(null);
  const [streams, setStreams] = useState<Stream[]>([]);
  const [activeStream, setActiveStream] = useState<Stream | null>(null);
  const [loadingStreams, setLoadingStreams] = useState(false);

  useEffect(() => {
    let on = true;
    fetch("/api/streamed/sports")
      .then((res) => res.json())
      .then((data) => {
        if (on && Array.isArray(data)) setSports(data);
      })
      .catch(() => undefined)
      .finally(() => {
        if (on) setLoadingSports(false);
      });
    return () => {
      on = false;
    };
  }, []);

  useEffect(() => {
    let on = true;
    fetch(`/api/streamed/matches/${active}`)
      .then((res) => res.json())
      .then((data) => {
        if (on) setMatches(Array.isArray(data) ? data : []);
      })
      .catch(() => {
        if (on) setMatches([]);
      })
      .finally(() => {
        if (on) setLoadingMatches(false);
      });
    return () => {
      on = false;
    };
  }, [active]);

  function chooseFilter(id: string) {
    if (id === active) return;
    setActive(id);
    setLoadingMatches(true);
  }

  async function openMatch(match: StreamedMatch) {
    setSelected(match);
    setStreams([]);
    setActiveStream(null);
    setLoadingStreams(true);

    const sources = match.sources ?? [];
    for (const source of sources) {
      try {
        const res = await fetch(`/api/streamed/stream/${source.source}/${source.id}`);
        const data = await res.json();
        if (Array.isArray(data) && data.length) {
          setStreams(data);
          setActiveStream(data[0]);
          setLoadingStreams(false);
          return;
        }
      } catch {
        // Try the next source.
      }
    }

    setLoadingStreams(false);
  }

  const filterLabel = useMemo(() => {
    if (active === "live") return "Live Matches";
    if (active === "all-today") return "Today's Matches";
    return sports.find((sport) => sport.id === active)?.name ?? "Sports";
  }, [active, sports]);

  return (
    <div className="min-h-screen pb-20 pt-24">
      <div className="mx-auto max-w-[1500px] px-4 sm:px-8">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex items-center gap-3">
            <span className="grid h-12 w-12 place-items-center rounded-2xl bg-accent/10 text-accent ring-1 ring-accent/30">
              <Trophy className="h-6 w-6" />
            </span>
            <div>
              <h1 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
                Sports
              </h1>
              <p className="text-sm text-muted">Live events from Streamed</p>
            </div>
          </div>

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
              sports.map((sport) => (
                <FilterButton
                  key={sport.id}
                  active={active === sport.id}
                  onClick={() => chooseFilter(sport.id)}
                >
                  {sport.name}
                </FilterButton>
              ))
            )}
          </div>
        </div>

        <div className="mt-8 flex items-center justify-between gap-4">
          <div>
            <h2 className="font-display text-2xl font-bold">{filterLabel}</h2>
            <p className="text-sm text-muted">{matches.length} events available</p>
          </div>
          <span className="hidden items-center gap-2 rounded-full border border-accent/30 bg-accent/10 px-3 py-1.5 text-xs font-semibold text-accent sm:inline-flex">
            <Sparkles className="h-3.5 w-3.5" /> Streamed API
          </span>
        </div>

        {loadingMatches ? (
          <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 9 }).map((_, i) => (
              <div key={i} className="shimmer h-44 rounded-2xl" />
            ))}
          </div>
        ) : matches.length ? (
          <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {matches.map((match, i) => (
              <motion.button
                key={`${match.id}-${i}`}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, delay: Math.min(i * 0.025, 0.25) }}
                onClick={() => openMatch(match)}
                className="group overflow-hidden rounded-2xl border border-border bg-surface/45 text-left transition-colors hover:border-accent/50 hover:bg-surface/70"
              >
                <div className="flex min-h-44 flex-col justify-between p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="mb-3 flex items-center gap-2">
                        <Badge>{match.category}</Badge>
                        {match.popular && <Badge tone="accent">Popular</Badge>}
                      </div>
                      <h3 className="line-clamp-2 font-display text-xl font-bold leading-tight">
                        {match.title}
                      </h3>
                      <p className="mt-2 text-sm text-muted">{formatMatchDate(match.date)}</p>
                    </div>
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-accent text-accent-foreground opacity-90 transition-transform group-hover:scale-110">
                      <CirclePlay className="h-5 w-5" />
                    </span>
                  </div>

                  <TeamRow match={match} />
                </div>
              </motion.button>
            ))}
          </div>
        ) : (
          <div className="mt-5 grid place-items-center rounded-2xl border border-dashed border-border py-16 text-center text-muted">
            <div>
              <ShieldQuestion className="mx-auto mb-3 h-8 w-8" />
              <p>No events found for this filter.</p>
            </div>
          </div>
        )}
      </div>

      <AnimatePresence>
        {selected && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelected(null)}
            className="fixed inset-0 z-50 grid place-items-center bg-black/80 p-4 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.96, opacity: 0, y: 14 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.96, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-6xl overflow-hidden rounded-2xl border border-border bg-surface shadow-2xl"
            >
              <div className="flex items-center gap-3 border-b border-border px-4 py-3">
                <div className="min-w-0 flex-1">
                  <h2 className="truncate font-display text-xl font-bold">{selected.title}</h2>
                  <p className="text-xs text-muted">{formatMatchDate(selected.date)}</p>
                </div>
                <button
                  onClick={() => setSelected(null)}
                  className="grid h-9 w-9 place-items-center rounded-full text-muted transition-colors hover:bg-foreground/10 hover:text-foreground"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="grid gap-0 lg:grid-cols-[1fr_260px]">
                <div className="relative aspect-video bg-black">
                  {loadingStreams ? (
                    <div className="absolute inset-0 grid place-items-center text-muted">
                      <Loader2 className="h-7 w-7 animate-spin" />
                    </div>
                  ) : activeStream ? (
                    <iframe
                      key={activeStream.embedUrl}
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
                  <p className="mb-2 px-1 text-xs font-semibold uppercase text-muted">
                    Streams
                  </p>
                  <div className="max-h-72 space-y-2 overflow-y-auto pr-1 lg:max-h-[520px]">
                    {streams.map((stream) => (
                      <button
                        key={stream.id}
                        onClick={() => setActiveStream(stream)}
                        className={cn(
                          "flex w-full items-center justify-between rounded-xl border px-3 py-2 text-left text-sm transition-colors",
                          activeStream?.id === stream.id
                            ? "border-accent bg-accent/12 text-foreground"
                            : "border-border text-muted hover:text-foreground",
                        )}
                      >
                        <span>
                          Stream {stream.streamNo}
                          <span className="block text-xs text-muted">{stream.language}</span>
                        </span>
                        <span className="rounded-full bg-foreground/10 px-2 py-0.5 text-[10px] font-bold">
                          {stream.hd ? "HD" : "SD"}
                        </span>
                      </button>
                    ))}
                  </div>
                </aside>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
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

function TeamRow({ match }: { match: StreamedMatch }) {
  const home = match.teams?.home;
  const away = match.teams?.away;
  if (!home && !away) return <div className="mt-5 text-sm text-muted">Event stream</div>;

  return (
    <div className="mt-5 flex items-center gap-3">
      <TeamBadge team={home} />
      <span className="text-xs font-bold text-muted">VS</span>
      <TeamBadge team={away} />
    </div>
  );
}

function TeamBadge({ team }: { team?: { name: string; badge: string } }) {
  if (!team) return null;
  return (
    <div className="flex min-w-0 items-center gap-2">
      <span className="grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-full bg-surface-2">
        {team.badge ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={`${STREAMED}/api/images/badge/${team.badge}.webp`}
            alt=""
            className="h-7 w-7 object-contain"
            loading="lazy"
          />
        ) : (
          <Trophy className="h-4 w-4 text-muted" />
        )}
      </span>
      <span className="truncate text-sm font-semibold">{team.name}</span>
    </div>
  );
}

function Badge({
  children,
  tone = "default",
}: {
  children: React.ReactNode;
  tone?: "default" | "accent";
}) {
  return (
    <span
      className={cn(
        "rounded-full px-2 py-0.5 text-[11px] font-bold capitalize",
        tone === "accent" ? "bg-accent/15 text-accent" : "bg-foreground/8 text-muted",
      )}
    >
      {children}
    </span>
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
