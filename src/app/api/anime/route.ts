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

// The "next season" of an entry is its TV-format SEQUEL (ignore OVA/movie sequels).
function nextSeasonId(media: Media | null): number | null {
  const edges = media?.relations?.edges ?? [];
  const seq = edges.find(
    (e) =>
      e.relationType === "SEQUEL" &&
      e.node?.type === "ANIME" &&
      ["TV", "TV_SHORT", "ONA"].includes(e.node?.format ?? ""),
  );
  return seq?.node?.id ?? null;
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

  let media = await anilist(SEARCH_QUERY, { search: title });
  if (!media) return NextResponse.json(fail);

  // Walk SEQUEL edges season-by-season until we reach the requested season or
  // the chain ends. `matched` records how far we actually got.
  let matched = 1;
  let guard = 0;
  while (matched < want && guard < 12) {
    const nextId = nextSeasonId(media);
    if (!nextId) break;
    const next = await anilist(BY_ID_QUERY, { id: nextId });
    if (!next) break;
    media = next;
    matched++;
    guard++;
  }

  return NextResponse.json({
    anilistId: media.id ?? null,
    malId: media.idMal ?? null,
    episodes: media.episodes ?? null,
    format: media.format ?? null,
    matchedSeason: matched,
  });
}
