import type { TmdbItem } from "@/lib/types";
import type { MediaType } from "@/lib/config";
import { getRecommendations, mediaKind } from "@/lib/tmdb";

export interface RecSeed {
  media_type: MediaType;
  tmdb_id: number;
  progress_percent: number;
  updated_at: string;
}

/**
 * Advanced, taste-profiled recommendations built from a user's ENTIRE watch
 * history. For each watched/watching title we pull TMDB's recommendations, then
 * score every candidate by:
 *   • seed weight   — recency of the watch × how much of it you watched
 *   • position      — how high the candidate ranks in that seed's rec list
 *   • co-occurrence — recommended by MORE of your watched titles ⇒ stronger
 *   • genre affinity— matches the genres that dominate your history
 *   • quality       — TMDB rating, as a gentle tie-breaker
 * Titles you've already watched are excluded.
 */
export async function buildRecommendations(
  history: RecSeed[],
  limit = 24,
): Promise<TmdbItem[]> {
  if (!history.length) return [];

  // Use the most recent ~10 titles as seeds (keeps it fast; recency-weighted).
  const seeds = [...history]
    .sort((a, b) => +new Date(b.updated_at) - +new Date(a.updated_at))
    .slice(0, 10);

  const watched = new Set(history.map((h) => `${h.media_type}:${h.tmdb_id}`));

  interface Cand {
    item: TmdbItem;
    score: number;
    sources: number;
  }
  const candidates = new Map<string, Cand>();
  const genreWeight = new Map<number, number>();

  await Promise.all(
    seeds.map(async (seed, idx) => {
      const recency = 1 - idx / (seeds.length + 2); // ~1 (newest) → ~0.2
      const progress = 0.5 + 0.5 * Math.min(1, (seed.progress_percent || 0) / 100);
      const seedW = recency * progress;

      let res;
      try {
        res = await getRecommendations(seed.media_type, seed.tmdb_id);
      } catch {
        return;
      }

      res.results.forEach((item, pos) => {
        if (!item.poster_path) return;
        const key = `${mediaKind(item)}:${item.id}`;
        if (watched.has(key)) return; // never recommend what you've seen

        const posBonus = Math.max(0.2, 1 - pos / 25);
        const add = seedW * posBonus;

        const cur = candidates.get(key);
        if (cur) {
          cur.score += add;
          cur.sources += 1;
        } else {
          candidates.set(key, { item, score: add, sources: 1 });
        }
        (item.genre_ids || []).forEach((g) =>
          genreWeight.set(g, (genreWeight.get(g) || 0) + add),
        );
      });
    }),
  );

  const maxG = Math.max(1, ...genreWeight.values());

  const scored = [...candidates.values()].map((c) => {
    const genres = c.item.genre_ids || [];
    const genreAff = genres.length
      ? genres.reduce((s, g) => s + (genreWeight.get(g) || 0), 0) /
        (maxG * genres.length)
      : 0;
    const coOccur = Math.log2(1 + c.sources); // recommended by multiple watches
    const quality = (c.item.vote_average || 0) / 10;
    const final = c.score + coOccur * 1.2 + genreAff + quality * 0.4;
    return { item: c.item, final };
  });

  scored.sort((a, b) => b.final - a.final);
  return scored.slice(0, limit).map((s) => s.item);
}
