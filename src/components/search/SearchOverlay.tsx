"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { Search, X, TrendingUp, Star } from "lucide-react";
import type { TmdbItem } from "@/lib/types";
import { searchMulti, getTrending, mediaKind, mediaTitle, mediaDate } from "@/lib/tmdb";
import { img } from "@/lib/config";
import { yearOf, cn } from "@/lib/utils";

type Filter = "all" | "movie" | "tv";

export function SearchOverlay({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [results, setResults] = useState<TmdbItem[]>([]);
  const [trending, setTrending] = useState<TmdbItem[]>([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // focus + body lock + trending on open
  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    const t = setTimeout(() => inputRef.current?.focus(), 120);
    if (!trending.length) {
      getTrending("all")
        .then((d) => setTrending(d.results.filter((r) => r.media_type !== "person").slice(0, 12)))
        .catch(() => {});
    }
    return () => {
      document.body.style.overflow = "";
      clearTimeout(t);
    };
  }, [open, trending.length]);

  // escape closes
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    if (open) window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  // debounced query
  const run = useCallback(
    async (q: string) => {
      if (q.trim().length < 2) {
        setResults([]);
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const d = await searchMulti(q.trim());
        setResults(d.results.filter((r) => r.media_type !== "person" && r.poster_path));
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    const t = setTimeout(() => run(query), 320);
    return () => clearTimeout(t);
  }, [query, run]);

  const shown = (filter === "all" ? results : results.filter((r) => mediaKind(r) === filter));

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          className="fixed inset-0 z-50 overflow-y-auto bg-background/80 backdrop-blur-2xl"
          onClick={(e) => e.target === e.currentTarget && onClose()}
        >
          <div className="mx-auto max-w-5xl px-4 pb-24 pt-[12vh] sm:px-8">
            {/* search bar */}
            <motion.div
              initial={{ y: -30, opacity: 0, scale: 0.97 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: -20, opacity: 0 }}
              transition={{ type: "spring", stiffness: 320, damping: 30 }}
              className="relative"
            >
              <div className="relative flex items-center gap-3 overflow-hidden rounded-2xl border border-border bg-surface/80 px-5 py-4 shadow-2xl">
                <span
                  className="pointer-events-none absolute inset-0 -z-10 opacity-60"
                  style={{
                    background:
                      "radial-gradient(40rem 6rem at 50% 50%, var(--glow), transparent 60%)",
                  }}
                />
                <Search className="h-6 w-6 shrink-0 text-accent" />
                <input
                  ref={inputRef}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search films, series, anything…"
                  className="w-full bg-transparent text-xl font-medium outline-none placeholder:text-muted/70"
                />
                {loading && (
                  <span className="h-5 w-5 shrink-0 animate-spin rounded-full border-2 border-accent border-t-transparent" />
                )}
                <button
                  onClick={onClose}
                  aria-label="Close"
                  className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-muted transition-colors hover:bg-foreground/10 hover:text-foreground"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* filters */}
              <div className="mt-4 flex items-center gap-2">
                {(["all", "movie", "tv"] as Filter[]).map((f) => (
                  <button
                    key={f}
                    onClick={() => setFilter(f)}
                    className={cn(
                      "relative rounded-full px-4 py-1.5 text-sm font-medium transition-colors",
                      filter === f ? "text-accent-foreground" : "text-muted hover:text-foreground",
                    )}
                  >
                    {filter === f && (
                      <motion.span
                        layoutId="search-filter"
                        className="absolute inset-0 -z-10 rounded-full bg-accent"
                        transition={{ type: "spring", stiffness: 400, damping: 30 }}
                      />
                    )}
                    {f === "all" ? "All" : f === "movie" ? "Films" : "Series"}
                  </button>
                ))}
              </div>
            </motion.div>

            {/* body */}
            <div className="mt-8">
              {query.trim().length < 2 ? (
                <Section title="Trending now" icon={<TrendingUp className="h-4 w-4" />}>
                  <ResultGrid items={trending} onPick={onClose} />
                </Section>
              ) : shown.length ? (
                <ResultGrid items={shown} onPick={onClose} />
              ) : !loading ? (
                <p className="py-16 text-center text-muted">
                  No treasure found for “{query}”.
                </p>
              ) : null}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function Section({
  title,
  icon,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div>
      <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-widest text-muted">
        {icon}
        {title}
      </h3>
      {children}
    </div>
  );
}

function ResultGrid({ items, onPick }: { items: TmdbItem[]; onPick: () => void }) {
  return (
    <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6">
      {items.map((item, i) => {
        const kind = mediaKind(item);
        return (
          <motion.div
            key={`${item.id}-${i}`}
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.3, delay: Math.min(i * 0.025, 0.4) }}
          >
            <Link
              href={`/${kind}/${item.id}`}
              onClick={onPick}
              className="group block"
            >
              <div className="relative aspect-[2/3] overflow-hidden rounded-lg border border-border bg-surface-2 transition-all group-hover:-translate-y-1 group-hover:ring-1 group-hover:ring-accent">
                {item.poster_path && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={img(item.poster_path, "w342")!}
                    alt={mediaTitle(item)}
                    loading="lazy"
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                  />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
                {!!item.vote_average && (
                  <span className="absolute left-1.5 top-1.5 flex items-center gap-0.5 rounded bg-black/60 px-1.5 py-0.5 text-[10px] font-semibold text-accent-bright backdrop-blur">
                    <Star className="h-2.5 w-2.5" fill="currentColor" />
                    {item.vote_average.toFixed(1)}
                  </span>
                )}
              </div>
              <p className="mt-1.5 truncate text-xs font-medium">{mediaTitle(item)}</p>
              <p className="text-[11px] text-muted">{yearOf(mediaDate(item))}</p>
            </Link>
          </motion.div>
        );
      })}
    </div>
  );
}
