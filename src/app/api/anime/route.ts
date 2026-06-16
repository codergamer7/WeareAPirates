import { NextRequest, NextResponse } from "next/server";

// Resolve a TMDB anime title to its AniList + MyAnimeList ids via AniList's
// public GraphQL. The anime players are keyed by these ids (MegaPlay = MAL,
// TryEmbed = AniList), which TMDB doesn't expose — so we look them up by title.
//
// Crucially, TMDB and AniList disagree on seasons: AniList lists each cour as a
// SEPARATE entry whose episodes restart at 1, while a TMDB "Season 2" is its own
// numbered season. So for season N we walk N-1 SEQUEL edges from the base entry
// to land on that season's own anime id. If the chain ends early (e.g. a single
// continuous entry like One Piece), the caller falls back to absolute numbering.
const ANILIST = "https://graphql.anilist.co";

const MEDIA_FIELDS = `
  id
  idMal
  episodes
  format
  relations {
    edges {
      relationType
      node { id type format }
    }
  }
`;
const SEARCH_QUERY = `query ($search: String) { Media(search: $search, type: ANIME, sort: SEARCH_MATCH) { ${MEDIA_FIELDS} } }`;
const BY_ID_QUERY = `query ($id: Int) { Media(id: $id, type: ANIME) { ${MEDIA_FIELDS} } }`;

type Edge = {
  relationType: string;
  node: { id: number; type: string; format: string | null };
};
interface Media {
  id: number;
  idMal: number | null;
  episodes: number | null;
  format: string | null;
  relations?: { edges: Edge[] };
}

async function anilist(
  query: string,
  variables: Record<string, unknown>,
): Promise<Media | null> {
  try {
    const res = await fetch(ANILIST, {
      method: "POST",
      headers: { "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify({ query, variables }),
    });
    if (!res.ok) return null;
    const json = await res.json();
    return (json?.data?.Media as Media) ?? null;
  } catch {
    return null;
  }
}

const SEASON_FORMATS = ["TV", "TV_SHORT", "ONA"];

// A broadcast cour counts as a "season"; movies/OVAs/specials do not.
function isSeasonFormat(media: Media | null): boolean {
  return SEASON_FORMATS.includes(media?.format ?? "");
}

// The next entry along the SEQUEL chain. Prefer a TV-type sequel, but fall back
// to ANY anime sequel so we can walk THROUGH an interleaved movie/OVA (e.g. Demon
// Slayer's Mugen Train film sits between S1 and S2) and still reach the next cour.
function sequelId(media: Media | null): number | null {
  const sequels = (media?.relations?.edges ?? []).filter(
    (e) => e.relationType === "SEQUEL" && e.node?.type === "ANIME",
  );
  const tv = sequels.find((e) => SEASON_FORMATS.includes(e.node?.format ?? ""));
  return (tv ?? sequels[0])?.node?.id ?? null;
}

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const title = sp.get("title")?.trim();
  const want = Math.max(1, Number(sp.get("season")) || 1);
  const fail = {
    malId: null,
    anilistId: null,
    episodes: null,
    format: null,
    matchedSeason: 1,
  };
  if (!title) return NextResponse.json(fail, { status: 400 });

  const base = await anilist(SEARCH_QUERY, { search: title });
  if (!base) return NextResponse.json(fail);

  // Walk the SEQUEL chain, counting only TV cours as seasons (walking through any
  // movies/OVAs in between). `seasonEntry` tracks the last real season we landed
  // on, `matched` how many seasons deep we reached.
  let cursor = base;
  let seasonEntry = base;
  let matched = 1;
  let guard = 0;
  const seen = new Set<number>([base.id]);
  while (matched < want && guard < 16) {
    const nextId = sequelId(cursor);
    if (!nextId || seen.has(nextId)) break;
    seen.add(nextId);
    const next = await anilist(BY_ID_QUERY, { id: nextId });
    if (!next) break;
    cursor = next;
    guard++;
    if (isSeasonFormat(next)) {
      matched++;
      seasonEntry = next;
    }
  }

  return NextResponse.json({
    anilistId: seasonEntry.id ?? null,
    malId: seasonEntry.idMal ?? null,
    episodes: seasonEntry.episodes ?? null,
    format: seasonEntry.format ?? null,
    matchedSeason: matched,
  });
}
