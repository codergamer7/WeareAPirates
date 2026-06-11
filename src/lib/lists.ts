import type { SupabaseBrowserClient } from "@/lib/supabase/client";
import type { ListType, Reminder, UserListItem, WatchProgress } from "@/lib/types";
import type { MediaType } from "@/lib/config";

type SB = SupabaseBrowserClient;

export interface ProgressInput {
  media_type: MediaType;
  tmdb_id: number;
  season?: number;
  episode?: number;
  title?: string | null;
  poster_path?: string | null;
  backdrop_path?: string | null;
  progress_seconds: number;
  duration_seconds: number;
}

export async function upsertProgress(sb: SB, userId: string, p: ProgressInput) {
  const season = p.season ?? 0;
  const episode = p.episode ?? 0;
  const percent = p.duration_seconds
    ? Math.min(100, (p.progress_seconds / p.duration_seconds) * 100)
    : 0;
  await sb.from("watch_progress").upsert(
    {
      user_id: userId,
      media_type: p.media_type,
      tmdb_id: p.tmdb_id,
      season,
      episode,
      title: p.title ?? null,
      poster_path: p.poster_path ?? null,
      backdrop_path: p.backdrop_path ?? null,
      progress_seconds: Math.round(p.progress_seconds),
      duration_seconds: Math.round(p.duration_seconds),
      progress_percent: percent,
      completed: percent >= 92,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,media_type,tmdb_id,season,episode" },
  );
}

export async function getContinueWatching(
  sb: SB,
  userId: string,
): Promise<WatchProgress[]> {
  const { data } = await sb
    .from("watch_progress")
    .select("*")
    .eq("user_id", userId)
    .eq("completed", false)
    .gt("progress_percent", 1)
    .order("updated_at", { ascending: false })
    .limit(20);
  return (data ?? []) as WatchProgress[];
}

// All progress rows (watched + watching) — the taste profile for recommendations.
export async function getWatchHistory(
  sb: SB,
  userId: string,
  limit = 60,
): Promise<WatchProgress[]> {
  const { data } = await sb
    .from("watch_progress")
    .select("*")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false })
    .limit(limit);
  return (data ?? []) as WatchProgress[];
}

export async function getProgressFor(
  sb: SB,
  userId: string,
  media_type: MediaType,
  tmdb_id: number,
  season = 0,
  episode = 0,
): Promise<WatchProgress | null> {
  const { data } = await sb
    .from("watch_progress")
    .select("*")
    .eq("user_id", userId)
    .eq("media_type", media_type)
    .eq("tmdb_id", tmdb_id)
    .eq("season", season)
    .eq("episode", episode)
    .maybeSingle();
  return (data as WatchProgress) ?? null;
}

export async function removeProgress(sb: SB, id: string) {
  await sb.from("watch_progress").delete().eq("id", id);
}

// ---------- "Already watched" marker ----------
// A title-level (season=0, episode=0) completed row. Lets users mark something
// as seen without playing it; it drops out of Continue Watching and feeds recs.
export interface WatchedInput {
  media_type: MediaType;
  tmdb_id: number;
  title?: string | null;
  poster_path?: string | null;
  backdrop_path?: string | null;
}

export async function markWatched(sb: SB, userId: string, item: WatchedInput) {
  await sb.from("watch_progress").upsert(
    {
      user_id: userId,
      media_type: item.media_type,
      tmdb_id: item.tmdb_id,
      season: 0,
      episode: 0,
      title: item.title ?? null,
      poster_path: item.poster_path ?? null,
      backdrop_path: item.backdrop_path ?? null,
      progress_seconds: 1,
      duration_seconds: 1,
      progress_percent: 100,
      completed: true,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,media_type,tmdb_id,season,episode" },
  );
}

export async function unmarkWatched(
  sb: SB,
  userId: string,
  media_type: MediaType,
  tmdb_id: number,
) {
  await sb
    .from("watch_progress")
    .delete()
    .eq("user_id", userId)
    .eq("media_type", media_type)
    .eq("tmdb_id", tmdb_id)
    .eq("season", 0)
    .eq("episode", 0);
}

export async function isWatched(
  sb: SB,
  userId: string,
  media_type: MediaType,
  tmdb_id: number,
): Promise<boolean> {
  const { data } = await sb
    .from("watch_progress")
    .select("completed")
    .eq("user_id", userId)
    .eq("media_type", media_type)
    .eq("tmdb_id", tmdb_id)
    .eq("season", 0)
    .eq("episode", 0)
    .maybeSingle();
  return !!(data as { completed?: boolean } | null)?.completed;
}

// ---------- Reminders ("Remind me") ----------
export interface ReminderInput {
  media_type: MediaType;
  tmdb_id: number;
  title?: string | null;
  poster_path?: string | null;
  backdrop_path?: string | null;
  air_date?: string | null;
  label?: string | null;
}

export async function getReminders(sb: SB, userId: string): Promise<Reminder[]> {
  const { data } = await sb
    .from("reminders")
    .select("*")
    .eq("user_id", userId)
    .order("air_date", { ascending: true, nullsFirst: false });
  return (data ?? []) as Reminder[];
}

export async function isRemindered(
  sb: SB,
  userId: string,
  media_type: MediaType,
  tmdb_id: number,
): Promise<boolean> {
  const { data } = await sb
    .from("reminders")
    .select("id")
    .eq("user_id", userId)
    .eq("media_type", media_type)
    .eq("tmdb_id", tmdb_id)
    .maybeSingle();
  return !!data;
}

// Toggle a reminder; returns true if it now exists.
export async function toggleReminder(
  sb: SB,
  userId: string,
  item: ReminderInput,
): Promise<boolean> {
  const { data: existing } = await sb
    .from("reminders")
    .select("id")
    .eq("user_id", userId)
    .eq("media_type", item.media_type)
    .eq("tmdb_id", item.tmdb_id)
    .maybeSingle();

  if (existing) {
    await sb.from("reminders").delete().eq("id", (existing as { id: string }).id);
    return false;
  }
  await sb.from("reminders").insert({
    user_id: userId,
    media_type: item.media_type,
    tmdb_id: item.tmdb_id,
    title: item.title ?? null,
    poster_path: item.poster_path ?? null,
    backdrop_path: item.backdrop_path ?? null,
    air_date: item.air_date ?? null,
    label: item.label ?? null,
  });
  return true;
}

export async function removeReminder(sb: SB, id: string) {
  await sb.from("reminders").delete().eq("id", id);
}

export async function getList(
  sb: SB,
  userId: string,
  listType: ListType,
): Promise<UserListItem[]> {
  const { data } = await sb
    .from("user_lists")
    .select("*")
    .eq("user_id", userId)
    .eq("list_type", listType)
    .order("created_at", { ascending: false });
  return (data ?? []) as UserListItem[];
}

export async function getListStatus(
  sb: SB,
  userId: string,
  media_type: MediaType,
  tmdb_id: number,
): Promise<Record<ListType, boolean>> {
  const { data } = await sb
    .from("user_lists")
    .select("list_type")
    .eq("user_id", userId)
    .eq("media_type", media_type)
    .eq("tmdb_id", tmdb_id);
  const set = new Set((data ?? []).map((r: { list_type: string }) => r.list_type));
  return {
    watchlist: set.has("watchlist"),
    saved: set.has("saved"),
    favorite: set.has("favorite"),
  };
}

export interface ListItemInput {
  media_type: MediaType;
  tmdb_id: number;
  title?: string | null;
  poster_path?: string | null;
}

// Toggles membership. Returns true if the item is now in the list.
export async function toggleList(
  sb: SB,
  userId: string,
  item: ListItemInput,
  listType: ListType,
): Promise<boolean> {
  const { data: existing } = await sb
    .from("user_lists")
    .select("id")
    .eq("user_id", userId)
    .eq("media_type", item.media_type)
    .eq("tmdb_id", item.tmdb_id)
    .eq("list_type", listType)
    .maybeSingle();

  if (existing) {
    await sb.from("user_lists").delete().eq("id", (existing as { id: string }).id);
    return false;
  }
  await sb.from("user_lists").insert({
    user_id: userId,
    media_type: item.media_type,
    tmdb_id: item.tmdb_id,
    list_type: listType,
    title: item.title ?? null,
    poster_path: item.poster_path ?? null,
  });
  return true;
}
