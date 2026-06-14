import { NextRequest, NextResponse } from "next/server";

// Resolve a TMDB anime title to its AniList + MyAnimeList ids via AniList's
// public GraphQL. The anime players are keyed by these ids (MegaPlay = MAL,
// TryEmbed = AniList), which TMDB doesn't expose — so we look them up by title.
const ANILIST = "https://graphql.anilist.co";
const QUERY = `
  query ($search: String) {
    Media(search: $search, type: ANIME, sort: SEARCH_MATCH) {
      id
      idMal
      episodes
      format
    }
  }
`;

export async function GET(req: NextRequest) {
  const title = req.nextUrl.searchParams.get("title")?.trim();
  if (!title) return NextResponse.json({ malId: null, anilistId: null }, { status: 400 });

  try {
    const res = await fetch(ANILIST, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        accept: "application/json",
      },
      body: JSON.stringify({ query: QUERY, variables: { search: title } }),
      next: { revalidate: 86400 },
    });
    if (!res.ok) return NextResponse.json({ malId: null, anilistId: null });
    const json = await res.json();
    const media = json?.data?.Media;
    return NextResponse.json({
      anilistId: media?.id ?? null,
      malId: media?.idMal ?? null,
      episodes: media?.episodes ?? null,
      format: media?.format ?? null,
    });
  } catch {
    return NextResponse.json({ malId: null, anilistId: null });
  }
}
