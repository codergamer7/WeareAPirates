import { NextResponse } from "next/server";
import { getServerUser } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

async function requireAdmin() {
  const user = await getServerUser();
  if (!user) return null;
  const admin = createSupabaseAdminClient();
  if (!admin) return null;
  const { data } = await admin
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (data?.role !== "admin") return null;
  return { admin };
}

const dayKey = (d: Date) => d.toISOString().slice(0, 10);

export async function GET() {
  const ctx = await requireAdmin();
  if (!ctx) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { admin } = ctx;

  // ---- profiles ----
  const { data: profiles } = await admin
    .from("profiles")
    .select("status, created_at");
  const profs = profiles ?? [];

  const totals = {
    users: profs.length,
    active: profs.filter((p) => p.status === "active").length,
    pending: profs.filter((p) => p.status === "pending").length,
    suspended: profs.filter((p) => p.status === "suspended").length,
  };

  // signups for the trailing 14 days, zero-filled
  const days = 14;
  const signupMap = new Map<string, number>();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    signupMap.set(dayKey(d), 0);
  }
  for (const p of profs) {
    if (!p.created_at) continue;
    const key = dayKey(new Date(p.created_at));
    if (signupMap.has(key)) signupMap.set(key, (signupMap.get(key) ?? 0) + 1);
  }
  const signups = [...signupMap.entries()].map(([date, count]) => ({ date, count }));

  // ---- watch_progress ----
  const { data: progressRows } = await admin
    .from("watch_progress")
    .select("media_type, tmdb_id, title, poster_path, user_id, completed, updated_at")
    .order("updated_at", { ascending: false })
    .limit(5000);
  const rows = progressRows ?? [];

  const dayAgo = Date.now() - 86_400_000;
  const watchers = new Set<string>();
  const activeWatchers = new Set<string>();
  let completed = 0;
  let inProgress = 0;

  type Agg = {
    media_type: string;
    tmdb_id: number;
    title: string | null;
    poster_path: string | null;
    plays: number;
    viewers: Set<string>;
  };
  const titleMap = new Map<string, Agg>();

  for (const r of rows) {
    watchers.add(r.user_id);
    if (r.updated_at && new Date(r.updated_at).getTime() >= dayAgo)
      activeWatchers.add(r.user_id);
    if (r.completed) completed++;
    else inProgress++;

    const key = `${r.media_type}:${r.tmdb_id}`;
    const agg =
      titleMap.get(key) ??
      ({
        media_type: r.media_type,
        tmdb_id: r.tmdb_id,
        title: r.title,
        poster_path: r.poster_path,
        plays: 0,
        viewers: new Set<string>(),
      } as Agg);
    agg.plays++;
    agg.viewers.add(r.user_id);
    if (!agg.title && r.title) agg.title = r.title;
    if (!agg.poster_path && r.poster_path) agg.poster_path = r.poster_path;
    titleMap.set(key, agg);
  }

  const topTitles = [...titleMap.values()]
    .sort((a, b) => b.viewers.size - a.viewers.size || b.plays - a.plays)
    .slice(0, 10)
    .map((t) => ({
      media_type: t.media_type,
      tmdb_id: t.tmdb_id,
      title: t.title,
      poster_path: t.poster_path,
      plays: t.plays,
      viewers: t.viewers.size,
    }));

  return NextResponse.json({
    totals,
    signups,
    watch: {
      sessions: rows.length,
      completed,
      inProgress,
      uniqueWatchers: watchers.size,
      activeViewers: activeWatchers.size,
    },
    topTitles,
  });
}
