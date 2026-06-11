import type { TmdbItem } from "@/lib/types";
import type { MediaType } from "@/lib/config";

// Generic client-side fetcher hitting our key-hiding proxy at /api/tmdb.
export async function tmdb<T = unknown>(
  path: string,
  params: Record<string, string | number | boolean | undefined> = {},
): Promise<T> {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== "") qs.set(k, String(v));
  }
  const url = `/api/tmdb/${path}${qs.toString() ? `?${qs}` : ""}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`TMDB ${path} → ${res.status}`);
  return res.json() as Promise<T>;
}

export interface Paged<T> {
  page: number;
  results: T[];
  total_pages: number;
  total_results: number;
}

export const mediaTitle = (i: TmdbItem) => i.title ?? i.name ?? "Untitled";
export const mediaDate = (i: TmdbItem) => i.release_date ?? i.first_air_date ?? "";
export const mediaKind = (i: TmdbItem): MediaType =>
  i.media_type === "tv" || (!!i.name && !i.title) ? "tv" : "movie";

// ---- Home rows ----
export const getTrending = (kind: "all" | MediaType = "all") =>
  tmdb<Paged<TmdbItem>>(`trending/${kind}/week`);
export const getPopular = (kind: MediaType) =>
  tmdb<Paged<TmdbItem>>(`${kind}/popular`);
export const getTopRated = (kind: MediaType) =>
  tmdb<Paged<TmdbItem>>(`${kind}/top_rated`);
export const getByGenre = (kind: MediaType, genreId: number) =>
  tmdb<Paged<TmdbItem>>(`discover/${kind}`, {
    with_genres: genreId,
    sort_by: "popularity.desc",
    "vote_count.gte": 200,
  });

// ---- Search ----
export const searchMulti = (query: string, page = 1) =>
  tmdb<Paged<TmdbItem>>("search/multi", { query, page, include_adult: false });

// ---- Detail (with appended sub-resources) ----
export const getDetail = (kind: MediaType, id: number | string) =>
  tmdb<any>(`${kind}/${id}`, {
    append_to_response: "credits,recommendations,similar,videos,external_ids,images,release_dates,content_ratings",
    include_image_language: "en,null",
  });

export const getSeason = (id: number | string, season: number) =>
  tmdb<any>(`tv/${id}/season/${season}`);

export const getRecommendations = (kind: MediaType, id: number | string) =>
  tmdb<Paged<TmdbItem>>(`${kind}/${id}/recommendations`);

// ---- Trailers ----
export interface TmdbVideo {
  key: string;
  site: string;
  type: string;
  name: string;
  official?: boolean;
}

// Pick the best YouTube trailer (official Trailer > Teaser > anything YouTube).
export function pickTrailer(videos?: { results?: TmdbVideo[] } | TmdbVideo[]): string | null {
  const list = Array.isArray(videos) ? videos : videos?.results ?? [];
  const yt = list.filter((v) => v.site === "YouTube");
  if (!yt.length) return null;
  const score = (v: TmdbVideo) =>
    (v.type === "Trailer" ? 4 : v.type === "Teaser" ? 2 : 0) + (v.official ? 1 : 0);
  return [...yt].sort((a, b) => score(b) - score(a))[0]?.key ?? null;
}

export const getVideos = (kind: MediaType, id: number | string) =>
  tmdb<{ results: TmdbVideo[] }>(`${kind}/${id}/videos`);

// Fetch the trailer key on demand (used by hero / cards).
export async function getTrailerKey(kind: MediaType, id: number | string) {
  try {
    return pickTrailer((await getVideos(kind, id)).results);
  } catch {
    return null;
  }
}

// ---- New this week ----
const dayISO = (offsetDays: number) => {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().slice(0, 10);
};

// Titles released in the trailing window (default 10 days), most popular first.
export async function getNewReleases(days = 10): Promise<TmdbItem[]> {
  const gte = dayISO(-days);
  const lte = dayISO(0);
  const empty: Paged<TmdbItem> = { page: 1, results: [], total_pages: 0, total_results: 0 };
  const [movies, tv] = await Promise.all([
    tmdb<Paged<TmdbItem>>("discover/movie", {
      "primary_release_date.gte": gte,
      "primary_release_date.lte": lte,
      sort_by: "popularity.desc",
      "vote_count.gte": 10,
      with_original_language: "en",
    }).catch(() => empty),
    tmdb<Paged<TmdbItem>>("discover/tv", {
      "first_air_date.gte": gte,
      "first_air_date.lte": lte,
      sort_by: "popularity.desc",
      "vote_count.gte": 5,
      with_original_language: "en",
    }).catch(() => empty),
  ]);
  const merged = [
    ...movies.results.map((m) => ({ ...m, media_type: "movie" as const })),
    ...tv.results.map((t) => ({ ...t, media_type: "tv" as const })),
  ].filter((i) => i.poster_path);
  // interleave by recency then popularity
  return merged.sort(
    (a, b) => (mediaDate(b) > mediaDate(a) ? 1 : -1) || b.vote_average - a.vote_average,
  );
}
