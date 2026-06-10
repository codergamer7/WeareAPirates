import { NextRequest, NextResponse } from "next/server";

// Returns IMDB rating data for an imdb id (tt…). Used to show real IMDB ★/10.
export async function GET(req: NextRequest) {
  const key = process.env.OMDB_API_KEY?.trim();
  const imdbId = req.nextUrl.searchParams.get("i");
  if (!key) return NextResponse.json({ error: "OMDB_API_KEY not set" }, { status: 503 });
  if (!imdbId) return NextResponse.json({ error: "missing imdb id" }, { status: 400 });

  try {
    const res = await fetch(
      `https://www.omdbapi.com/?apikey=${key}&i=${encodeURIComponent(imdbId)}`,
      { next: { revalidate: 86400 } },
    );
    const data = await res.json();
    return NextResponse.json(
      {
        imdbRating: data.imdbRating ?? null,
        imdbVotes: data.imdbVotes ?? null,
        rated: data.Rated ?? null,
        awards: data.Awards ?? null,
        metascore: data.Metascore ?? null,
        runtime: data.Runtime ?? null,
        director: data.Director ?? null,
        writer: data.Writer ?? null,
      },
      { status: 200 },
    );
  } catch {
    return NextResponse.json({ error: "OMDB request failed" }, { status: 502 });
  }
}
