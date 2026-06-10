import { NextRequest, NextResponse } from "next/server";

const STREAMED_API = "https://streamed.pk/api";
const ALLOWED_ROOTS = new Set(["sports", "matches", "stream"]);

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path } = await params;
  const root = path[0];

  if (!root || !ALLOWED_ROOTS.has(root)) {
    return NextResponse.json({ error: "Unsupported Streamed endpoint" }, { status: 400 });
  }

  const qs = req.nextUrl.searchParams.toString();
  const url = `${STREAMED_API}/${path.map(encodeURIComponent).join("/")}${qs ? `?${qs}` : ""}`;

  try {
    const res = await fetch(url, {
      headers: { accept: "application/json" },
      next: { revalidate: root === "sports" ? 3600 : 30 },
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json({ error: "Streamed request failed" }, { status: 502 });
  }
}
