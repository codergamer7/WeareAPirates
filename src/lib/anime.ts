// Anime helpers: detect anime titles and resolve their MyAnimeList id (needed
// for vidlink's sub/dub anime player).

export type AnimeAudio = "sub" | "dub";

export interface AnimeMap {
  malId: number | null; // MegaPlay
  anilistId?: number | null; // TryEmbed
  episodes?: number | null;
  format?: string | null;
}

// Heuristic: Japanese animation = anime. TMDB genre 16 is "Animation"; pairing
// it with a Japanese origin/language avoids tagging Western cartoons.
export function isAnimeDetail(d: unknown): boolean {
  const detail = d as {
    genres?: { id: number }[];
    original_language?: string;
    origin_country?: string[];
  } | null;
  if (!detail) return false;
  const isAnimation = (detail.genres ?? []).some((g) => g.id === 16);
  const ja = detail.original_language === "ja";
  const jp = (detail.origin_country ?? []).includes("JP");
  return isAnimation && (ja || jp);
}

export async function resolveAnime(title: string): Promise<AnimeMap> {
  if (!title) return { malId: null };
  try {
    const r = await fetch(`/api/anime?title=${encodeURIComponent(title)}`);
    if (!r.ok) return { malId: null };
    return (await r.json()) as AnimeMap;
  } catch {
    return { malId: null };
  }
}
