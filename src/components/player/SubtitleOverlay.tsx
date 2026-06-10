"use client";

import { useEffect, useRef, useState } from "react";
import { subtitleStyle, useSubs } from "@/lib/subtitle-context";

interface Cue {
  start: number;
  end: number;
  text: string;
}

// "HH:MM:SS.mmm" / "MM:SS,mmm" -> seconds
function ts(t: string): number {
  const m = t.trim().match(/(?:(\d+):)?(\d{1,2}):(\d{2})[.,](\d{1,3})/);
  if (!m) return 0;
  const h = m[1] ? parseInt(m[1], 10) : 0;
  return h * 3600 + parseInt(m[2], 10) * 60 + parseInt(m[3], 10) + parseInt(m[4], 10) / 1000;
}

function parseVtt(src: string): Cue[] {
  const cues: Cue[] = [];
  for (const block of src.replace(/\r/g, "").split(/\n\n+/)) {
    const lines = block.split("\n").filter((l) => l.trim() !== "");
    const idx = lines.findIndex((l) => l.includes("-->"));
    if (idx === -1) continue;
    const [a, b] = lines[idx].split("-->");
    const start = ts(a);
    const end = ts(b);
    const text = lines
      .slice(idx + 1)
      .join("\n")
      .replace(/<[^>]+>/g, "")
      .trim();
    if (text && end > start) cues.push({ start, end, text });
  }
  return cues;
}

export function SubtitleOverlay({
  tmdbId,
  imdbId,
  season,
  episode,
}: {
  tmdbId: number;
  imdbId?: string;
  season?: number;
  episode?: number;
}) {
  const { prefs } = useSubs();
  const cuesRef = useRef<Cue[]>([]);
  const lastRef = useRef("");
  const [text, setText] = useState("");

  // load the subtitle track for the chosen language
  useEffect(() => {
    cuesRef.current = [];
    lastRef.current = "";
    setText("");
    if (!prefs.autoDetect) return;

    let on = true;
    (async () => {
      try {
        const id = imdbId || String(tmdbId);
        const params = new URLSearchParams({ id, language: prefs.language });
        if (season) params.set("season", String(season));
        if (episode) params.set("episode", String(episode));
        const list = await fetch(`/api/subtitles?${params}`).then((r) => r.json());
        if (!on || !Array.isArray(list) || !list.length) return;
        const pick =
          list.find(
            (s: { language: string; isHearingImpaired: boolean }) =>
              s.language === prefs.language && !s.isHearingImpaired,
          ) ||
          list.find((s: { language: string }) => s.language === prefs.language) ||
          list[0];
        const vtt = await fetch(
          `/api/subtitles?file=${encodeURIComponent(pick.url)}`,
        ).then((r) => r.text());
        if (on) cuesRef.current = parseVtt(vtt);
      } catch {
        cuesRef.current = [];
      }
    })();
    return () => {
      on = false;
    };
  }, [tmdbId, imdbId, season, episode, prefs.autoDetect, prefs.language]);

  // follow the player's clock (PLAYER_EVENT timeupdate)
  useEffect(() => {
    function onMsg(e: MessageEvent) {
      let p: unknown = e.data;
      if (typeof p === "string") {
        try {
          p = JSON.parse(p);
        } catch {
          return;
        }
      }
      const evt = p as { type?: string; data?: { currentTime?: number } };
      if (evt?.type !== "PLAYER_EVENT" || typeof evt.data?.currentTime !== "number") return;
      const t = evt.data.currentTime;
      const cue = cuesRef.current.find((c) => t >= c.start && t <= c.end);
      const next = cue ? cue.text : "";
      if (next !== lastRef.current) {
        lastRef.current = next;
        setText(next);
      }
    }
    window.addEventListener("message", onMsg);
    return () => window.removeEventListener("message", onMsg);
  }, []);

  if (!prefs.autoDetect || !text) return null;

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-[7%] z-20 flex justify-center px-[6%]">
      <span
        className="inline-block max-w-full whitespace-pre-line text-center"
        style={subtitleStyle(prefs)}
      >
        {text}
      </span>
    </div>
  );
}
