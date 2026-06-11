"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Activity, CheckCircle2, Clock, Eye, PlayCircle, Users } from "lucide-react";
import { img } from "@/lib/config";
import { useCountUp } from "@/lib/use-count-up";

interface Analytics {
  totals: { users: number; active: number; pending: number; suspended: number };
  signups: { date: string; count: number }[];
  watch: {
    sessions: number;
    completed: number;
    inProgress: number;
    uniqueWatchers: number;
    activeViewers: number;
  };
  topTitles: {
    media_type: string;
    tmdb_id: number;
    title: string | null;
    poster_path: string | null;
    plays: number;
    viewers: number;
  }[];
}

export function AnalyticsPanel() {
  const [data, setData] = useState<Analytics | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let on = true;
    fetch("/api/admin/analytics")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => on && setData(d))
      .catch(() => on && setError(true));
    return () => {
      on = false;
    };
  }, []);

  if (error)
    return (
      <div className="grid place-items-center rounded-2xl border border-dashed border-border py-16 text-muted">
        Couldn’t load analytics.
      </div>
    );

  if (!data)
    return (
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="shimmer h-24 rounded-2xl" />
          ))}
        </div>
        <div className="shimmer h-56 rounded-2xl" />
      </div>
    );

  const maxSignup = Math.max(1, ...data.signups.map((s) => s.count));

  return (
    <div className="space-y-6">
      {/* stat cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        <Metric
          label="Active now (24h)"
          value={data.watch.activeViewers}
          icon={<Activity className="h-5 w-5" />}
          tone="text-emerald-400"
        />
        <Metric
          label="Unique watchers"
          value={data.watch.uniqueWatchers}
          icon={<Users className="h-5 w-5" />}
          tone="text-accent"
        />
        <Metric
          label="Watch sessions"
          value={data.watch.sessions}
          icon={<PlayCircle className="h-5 w-5" />}
          tone="text-sky-400"
        />
        <Metric
          label="In progress"
          value={data.watch.inProgress}
          icon={<Clock className="h-5 w-5" />}
          tone="text-amber-400"
        />
        <Metric
          label="Completed"
          value={data.watch.completed}
          icon={<CheckCircle2 className="h-5 w-5" />}
          tone="text-violet-400"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        {/* signups chart */}
        <div className="rounded-2xl border border-border bg-surface/40 p-5">
          <h3 className="mb-1 font-display text-lg font-bold">Signups</h3>
          <p className="mb-4 text-xs text-muted">New accounts over the last 14 days</p>
          <div className="flex h-44 items-end gap-1.5">
            {data.signups.map((s) => (
              <div key={s.date} className="group/bar flex flex-1 flex-col items-center gap-2">
                <div className="relative flex w-full flex-1 items-end">
                  <motion.div
                    initial={{ height: 0 }}
                    animate={{ height: `${(s.count / maxSignup) * 100}%` }}
                    transition={{ duration: 0.5, ease: "easeOut" }}
                    className="w-full rounded-t-md bg-gradient-to-t from-accent/40 to-accent"
                    style={{ minHeight: s.count > 0 ? 6 : 0 }}
                  >
                    <span className="absolute -top-5 left-1/2 -translate-x-1/2 text-[10px] font-bold text-foreground opacity-0 transition-opacity group-hover/bar:opacity-100">
                      {s.count}
                    </span>
                  </motion.div>
                </div>
                <span className="text-[9px] text-muted">{s.date.slice(8)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* status split */}
        <div className="rounded-2xl border border-border bg-surface/40 p-5">
          <h3 className="mb-4 font-display text-lg font-bold">Crew status</h3>
          <StatusBar label="Active" value={data.totals.active} total={data.totals.users} color="bg-emerald-400" />
          <StatusBar label="Pending" value={data.totals.pending} total={data.totals.users} color="bg-amber-400" />
          <StatusBar label="Suspended" value={data.totals.suspended} total={data.totals.users} color="bg-red-400" />
          <div className="mt-4 border-t border-border pt-3 text-sm text-muted">
            {data.totals.users} total accounts
          </div>
        </div>
      </div>

      {/* top titles */}
      <div className="rounded-2xl border border-border bg-surface/40 p-5">
        <h3 className="mb-4 flex items-center gap-2 font-display text-lg font-bold">
          <Eye className="h-5 w-5 text-accent" /> Most-watched titles
        </h3>
        {data.topTitles.length === 0 ? (
          <p className="text-sm text-muted">No watch activity yet.</p>
        ) : (
          <div className="space-y-2">
            {data.topTitles.map((t, i) => (
              <Link
                key={`${t.media_type}-${t.tmdb_id}`}
                href={`/${t.media_type}/${t.tmdb_id}`}
                className="flex items-center gap-3 rounded-xl p-2 transition-colors hover:bg-foreground/5"
              >
                <span className="w-5 text-center font-display text-lg font-bold text-muted">
                  {i + 1}
                </span>
                <div className="h-14 w-10 shrink-0 overflow-hidden rounded-md bg-surface-2">
                  {t.poster_path && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={img(t.poster_path, "w92")!}
                      alt={t.title ?? ""}
                      className="h-full w-full object-cover"
                    />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{t.title || "Untitled"}</p>
                  <p className="text-xs uppercase tracking-wide text-muted">
                    {t.media_type === "tv" ? "Series" : "Film"}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-accent">{t.viewers}</p>
                  <p className="text-[11px] text-muted">
                    {t.viewers === 1 ? "viewer" : "viewers"}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Metric({
  label,
  value,
  icon,
  tone,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  tone: string;
}) {
  const n = useCountUp(value);
  return (
    <div className="rounded-2xl border border-border bg-surface/40 p-4 transition-colors hover:border-accent/40">
      <div className={`mb-2 ${tone}`}>{icon}</div>
      <p className="font-display text-3xl font-bold tabular-nums">{n}</p>
      <p className="text-xs text-muted">{label}</p>
    </div>
  );
}

function StatusBar({
  label,
  value,
  total,
  color,
}: {
  label: string;
  value: number;
  total: number;
  color: string;
}) {
  const pct = total ? (value / total) * 100 : 0;
  return (
    <div className="mb-3">
      <div className="mb-1 flex justify-between text-xs">
        <span className="text-muted">{label}</span>
        <span className="font-semibold">{value}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-foreground/10">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className={`h-full rounded-full ${color}`}
        />
      </div>
    </div>
  );
}
