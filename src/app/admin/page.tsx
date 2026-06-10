"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Ban,
  Check,
  Search,
  Shield,
  ShieldOff,
  Trash2,
  Undo2,
  Users,
  Video,
  X,
} from "lucide-react";
import type { Profile, ProfileStatus } from "@/lib/types";
import {
  DEFAULT_PLAYER_PROVIDER,
  PLAYER_PROVIDER_LABELS,
  PLAYER_PROVIDERS,
  type PlayerProvider,
} from "@/lib/player-provider";
import { useAuth } from "@/lib/auth-context";
import { prettyDate, cn } from "@/lib/utils";

type Action = "approve" | "suspend" | "reactivate" | "promote" | "demote" | "delete";
type StatusFilter = "all" | ProfileStatus;

export default function AdminPage() {
  const { isAdmin, profile, loading } = useAuth();
  const [users, setUsers] = useState<Profile[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [fetching, setFetching] = useState(true);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<StatusFilter>("all");
  const [suspendTarget, setSuspendTarget] = useState<Profile | null>(null);
  const [playerProvider, setPlayerProvider] = useState<PlayerProvider>(DEFAULT_PLAYER_PROVIDER);
  const [providerSaving, setProviderSaving] = useState(false);
  const [note, setNote] = useState("");

  const load = useCallback(async () => {
    setFetching(true);
    try {
      const [res, providerRes] = await Promise.all([
        fetch("/api/admin"),
        fetch("/api/admin/player-provider"),
      ]);
      const data = await res.json();
      const providerData = await providerRes.json().catch(() => ({}));
      setUsers(data.users ?? []);
      if (PLAYER_PROVIDERS.includes(providerData.provider)) {
        setPlayerProvider(providerData.provider);
      }
    } catch {
      setUsers([]);
    } finally {
      setFetching(false);
    }
  }, []);

  useEffect(() => {
    if (isAdmin) void Promise.resolve().then(load);
  }, [isAdmin, load]);

  async function act(userId: string, action: Action, n?: string) {
    setBusy(userId + action);
    try {
      await fetch("/api/admin", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ userId, action, note: n }),
      });
      await load();
    } finally {
      setBusy(null);
    }
  }

  async function savePlayerProvider(provider: PlayerProvider) {
    setPlayerProvider(provider);
    setProviderSaving(true);
    try {
      const res = await fetch("/api/admin/player-provider", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ provider }),
      });
      const data = await res.json().catch(() => ({}));
      if (PLAYER_PROVIDERS.includes(data.provider)) setPlayerProvider(data.provider);
    } finally {
      setProviderSaving(false);
    }
  }

  const stats = useMemo(() => {
    return {
      total: users.length,
      pending: users.filter((u) => u.status === "pending").length,
      active: users.filter((u) => u.status === "active").length,
      suspended: users.filter((u) => u.status === "suspended").length,
    };
  }, [users]);

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return users
      .filter((u) => (filter === "all" ? true : u.status === filter))
      .filter(
        (u) =>
          !q ||
          u.email?.toLowerCase().includes(q) ||
          u.display_name?.toLowerCase().includes(q),
      );
  }, [users, filter, query]);

  if (loading) return <div className="min-h-screen" />;

  if (!isAdmin) {
    return (
      <div className="grid min-h-screen place-items-center px-6 text-center">
        <div>
          <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-2xl bg-red-500/10 text-red-400">
            <ShieldOff className="h-8 w-8" />
          </div>
          <h1 className="font-display text-3xl font-bold">Restricted waters</h1>
          <p className="mt-2 text-muted">You don’t have access to the control panel.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-20 pt-24">
      <div className="mx-auto max-w-[1400px] px-4 sm:px-8">
        <div className="flex items-center gap-3">
          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-accent/10 text-accent ring-1 ring-accent/30">
            <Shield className="h-6 w-6" />
          </span>
          <div>
            <h1 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
              Master Control Panel
            </h1>
            <p className="text-sm text-muted">Approve, suspend, and manage every account.</p>
          </div>
        </div>

        {/* stats */}
        <div className="mt-7 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="Total crew" value={stats.total} icon={<Users className="h-5 w-5" />} tone="default" />
          <Stat label="Pending" value={stats.pending} icon={<Check className="h-5 w-5" />} tone="amber" />
          <Stat label="Active" value={stats.active} icon={<Check className="h-5 w-5" />} tone="green" />
          <Stat label="Suspended" value={stats.suspended} icon={<Ban className="h-5 w-5" />} tone="red" />
        </div>

        {/* controls */}
        <div className="mt-7 grid gap-3 lg:grid-cols-[1fr_auto] lg:items-center">
          <div className="flex flex-1 items-center gap-2 rounded-xl border border-border bg-surface/50 px-3.5 py-2.5">
            <Search className="h-4 w-4 text-muted" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search name or email…"
              className="w-full bg-transparent text-sm outline-none placeholder:text-muted/60"
            />
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="flex gap-1.5">
              {(["all", "pending", "active", "suspended"] as StatusFilter[]).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={cn(
                    "relative rounded-full px-3.5 py-2 text-xs font-semibold capitalize transition-colors",
                    filter === f ? "text-accent-foreground" : "text-muted hover:text-foreground",
                  )}
                >
                  {filter === f && (
                    <motion.span
                      layoutId="admin-filter"
                      className="absolute inset-0 -z-10 rounded-full bg-accent"
                      transition={{ type: "spring", stiffness: 400, damping: 30 }}
                    />
                  )}
                  {f}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2 rounded-xl border border-border bg-surface/50 px-2.5 py-2">
              <Video className="h-4 w-4 text-accent" />
              <div className="flex gap-1">
                {PLAYER_PROVIDERS.map((provider) => (
                  <button
                    key={provider}
                    onClick={() => savePlayerProvider(provider)}
                    disabled={providerSaving}
                    className={cn(
                      "relative rounded-full px-3 py-1.5 text-xs font-semibold transition-colors disabled:opacity-60",
                      playerProvider === provider
                        ? "text-accent-foreground"
                        : "text-muted hover:text-foreground",
                    )}
                  >
                    {playerProvider === provider && (
                      <motion.span
                        layoutId="player-provider"
                        className="absolute inset-0 -z-10 rounded-full bg-accent"
                        transition={{ type: "spring", stiffness: 400, damping: 30 }}
                      />
                    )}
                    {PLAYER_PROVIDER_LABELS[provider]}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* user list */}
        <div className="mt-5 space-y-2.5">
          {fetching ? (
            Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="shimmer h-20 rounded-2xl" />
            ))
          ) : shown.length === 0 ? (
            <div className="grid place-items-center rounded-2xl border border-dashed border-border py-16 text-muted">
              No accounts match.
            </div>
          ) : (
            shown.map((u, i) => (
              <motion.div
                key={u.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: Math.min(i * 0.03, 0.3) }}
                className="flex flex-col gap-3 rounded-2xl border border-border bg-surface/40 p-4 md:flex-row md:items-center"
              >
                <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-accent-bright to-accent text-lg font-bold text-accent-foreground">
                  {(u.display_name || u.email).charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold">{u.display_name || "—"}</p>
                    <StatusBadge status={u.status} />
                    {u.role === "admin" && (
                      <span className="flex items-center gap-1 rounded-full bg-accent/15 px-2 py-0.5 text-[11px] font-semibold text-accent">
                        <Shield className="h-3 w-3" /> admin
                      </span>
                    )}
                  </div>
                  <p className="truncate text-sm text-muted">{u.email}</p>
                  {u.status === "suspended" && u.suspension_note && (
                    <p className="mt-1 truncate text-xs italic text-red-400/80">
                      “{u.suspension_note}”
                    </p>
                  )}
                  <p className="mt-0.5 text-[11px] text-muted">
                    Joined {prettyDate(u.created_at)}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {u.status === "pending" && (
                    <Btn tone="green" loading={busy === u.id + "approve"} onClick={() => act(u.id, "approve")}>
                      <Check className="h-4 w-4" /> Approve
                    </Btn>
                  )}
                  {u.status === "active" && (
                    <Btn tone="red" loading={busy === u.id + "suspend"} onClick={() => { setSuspendTarget(u); setNote(""); }}>
                      <Ban className="h-4 w-4" /> Suspend
                    </Btn>
                  )}
                  {u.status === "suspended" && (
                    <Btn tone="green" loading={busy === u.id + "reactivate"} onClick={() => act(u.id, "reactivate")}>
                      <Undo2 className="h-4 w-4" /> Reactivate
                    </Btn>
                  )}
                  {u.id !== profile?.id && (
                    <>
                      {u.role === "admin" ? (
                        <Btn tone="ghost" loading={busy === u.id + "demote"} onClick={() => act(u.id, "demote")}>
                          <ShieldOff className="h-4 w-4" /> Demote
                        </Btn>
                      ) : (
                        <Btn tone="ghost" loading={busy === u.id + "promote"} onClick={() => act(u.id, "promote")}>
                          <Shield className="h-4 w-4" /> Make admin
                        </Btn>
                      )}
                      <Btn tone="danger" loading={busy === u.id + "delete"} onClick={() => { if (confirm(`Permanently delete ${u.email}?`)) act(u.id, "delete"); }}>
                        <Trash2 className="h-4 w-4" />
                      </Btn>
                    </>
                  )}
                </div>
              </motion.div>
            ))
          )}
        </div>
      </div>

      {/* suspend modal */}
      <AnimatePresence>
        {suspendTarget && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSuspendTarget(null)}
            className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.92, opacity: 0, y: 16 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.92, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md rounded-3xl border border-red-500/30 bg-surface p-6 shadow-2xl"
            >
              <div className="mb-4 flex items-center gap-3">
                <span className="grid h-11 w-11 place-items-center rounded-xl bg-red-500/15 text-red-400">
                  <Ban className="h-5 w-5" />
                </span>
                <div>
                  <h2 className="font-display text-xl font-bold">Suspend account</h2>
                  <p className="text-xs text-muted">{suspendTarget.email}</p>
                </div>
                <button onClick={() => setSuspendTarget(null)} className="ml-auto text-muted hover:text-foreground">
                  <X className="h-5 w-5" />
                </button>
              </div>
              <label className="block text-xs font-semibold uppercase tracking-widest text-muted">
                Message shown to the user
              </label>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={4}
                autoFocus
                placeholder="e.g. Your subscription payment is overdue. Please contact billing to restore access."
                className="mt-2 w-full resize-none rounded-xl border border-border bg-surface-2/60 px-4 py-3 text-sm outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500/30"
              />
              <div className="mt-5 flex justify-end gap-2">
                <button
                  onClick={() => setSuspendTarget(null)}
                  className="rounded-full px-5 py-2.5 text-sm font-medium text-muted hover:text-foreground"
                >
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    const t = suspendTarget;
                    setSuspendTarget(null);
                    await act(t.id, "suspend", note);
                  }}
                  className="inline-flex items-center gap-2 rounded-full bg-red-500 px-5 py-2.5 text-sm font-bold text-white transition-transform hover:scale-105"
                >
                  <Ban className="h-4 w-4" /> Suspend account
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Stat({
  label,
  value,
  icon,
  tone,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  tone: "default" | "amber" | "green" | "red";
}) {
  const tones = {
    default: "text-accent",
    amber: "text-amber-400",
    green: "text-emerald-400",
    red: "text-red-400",
  };
  return (
    <div className="rounded-2xl border border-border bg-surface/40 p-4">
      <div className={cn("mb-2", tones[tone])}>{icon}</div>
      <p className="font-display text-3xl font-bold">{value}</p>
      <p className="text-xs text-muted">{label}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: ProfileStatus }) {
  const map = {
    pending: "bg-amber-500/15 text-amber-400",
    active: "bg-emerald-500/15 text-emerald-400",
    suspended: "bg-red-500/15 text-red-400",
  };
  return (
    <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-semibold capitalize", map[status])}>
      {status}
    </span>
  );
}

function Btn({
  children,
  onClick,
  tone,
  loading,
}: {
  children: React.ReactNode;
  onClick: () => void;
  tone: "green" | "red" | "ghost" | "danger";
  loading?: boolean;
}) {
  const tones = {
    green: "bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25",
    red: "bg-red-500/15 text-red-400 hover:bg-red-500/25",
    ghost: "border border-border text-muted hover:text-foreground",
    danger: "bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white",
  };
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-xs font-semibold transition-colors disabled:opacity-50",
        tones[tone],
      )}
    >
      {loading ? (
        <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
      ) : (
        children
      )}
    </button>
  );
}
