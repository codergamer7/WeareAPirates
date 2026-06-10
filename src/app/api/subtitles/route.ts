import { NextRequest, NextResponse } from "next/server";

const WYZIE = "https://sub.wyzie.io/search";

function srtToVtt(srt: string) {
  const body = srt
    .replace(/\r+/g, "")
    .replace(/(\d{2}:\d{2}:\d{2}),(\d{3})/g, "$1.$2");
  return `WEBVTT\n\n${body}`;
}

// Two modes:
//   ?id=<tmdb|imdb>&season=&episode=&language=&hi=   -> list subtitles (JSON)
//   ?file=<encoded subtitle url>                      -> proxy + convert to VTT
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const file = sp.get("file");

  // --- proxy a single subtitle file, converting SRT -> VTT for <track> use ---
  if (file) {
    try {
      const res = await fetch(file);
      const text = await res.text();
      const vtt = text.trimStart().startsWith("WEBVTT") ? text : srtToVtt(text);
      return new NextResponse(vtt, {
        status: 200,
        headers: {
          "content-type": "text/vtt; charset=utf-8",
          "cache-control": "public, max-age=86400",
        },
      });
    } catch {
      return NextResponse.json({ error: "fetch failed" }, { status: 502 });
    }
  }

  // --- list subtitles via Wyzie ---
  const id = sp.get("id");
  if (!id) return NextResponse.json({ error: "missing id" }, { status: 400 });

  const qs = new URLSearchParams();
  qs.set("id", id);
  for (const k of ["season", "episode", "language", "hi", "format", "source"]) {
    const v = sp.get(k);
    if (v) qs.set(k, v);
  }
  const key = process.env.WYZIE_API_KEY?.trim();
  if (key) qs.set("key", key);

  try {
    const res = await fetch(`${WYZIE}?${qs.toString()}`, {
      next: { revalidate: 3600 },
    });
    if (!res.ok) {
      return NextResponse.json(
        { error: `Wyzie ${res.status}`, results: [] },
        { status: 200 },
      );
    }
    const data = await res.json();
    return NextResponse.json(Array.isArray(data) ? data : [], { status: 200 });
  } catch {
    return NextResponse.json([], { status: 200 });
  }
}
