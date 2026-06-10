import { NextRequest, NextResponse } from "next/server";

const TMDB = "https://api.themoviedb.org/3";

// Key-hiding proxy for arbitrary TMDB v3 paths.
// Supports either a v3 API key (32-char) or a v4 read access token (JWT).
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const key = process.env.TMDB_API_KEY?.trim();
  if (!key) {
    return NextResponse.json(
      { error: "TMDB_API_KEY is not set. Add it to .env.local." },
      { status: 503 },
    );
  }

  const { path } = await params;
  const qs = new URLSearchParams(req.nextUrl.searchParams);
  if (!qs.has("language")) qs.set("language", "en-US");

  const isV4 = key.startsWith("eyJ");
  if (!isV4) qs.set("api_key", key);

  const url = `${TMDB}/${path.join("/")}?${qs.toString()}`;
  const headers: Record<string, string> = { accept: "application/json" };
  if (isV4) headers.Authorization = `Bearer ${key}`;

  try {
    const res = await fetch(url, { headers, next: { revalidate: 3600 } });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json({ error: "TMDB request failed" }, { status: 502 });
  }
}
