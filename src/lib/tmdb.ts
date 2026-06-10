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
