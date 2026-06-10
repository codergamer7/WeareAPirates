"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

export type SubSize = "XS" | "S" | "S+" | "M" | "M+" | "L" | "XL" | "XXL";
export type SubShadow = "none" | "drop" | "outline";

export interface SubPrefs {
  autoDetect: boolean; // auto-load subtitles in the default language
  size: SubSize;
  color: string;
  shadow: SubShadow;
  background: boolean;
  opacity: number; // 0–100
  language: string; // ISO code
  videoGlow: boolean;
}

export const DEFAULT_SUB_PREFS: SubPrefs = {
  autoDetect: true,
  size: "M",
  color: "#ffffff",
  shadow: "drop",
  background: true,
  opacity: 100,
  language: "en",
  videoGlow: true,
};

export const SUB_SIZES: SubSize[] = ["XS", "S", "S+", "M", "M+", "L", "XL", "XXL"];
export const SUB_SIZE_PX: Record<SubSize, number> = {
  XS: 15,
  S: 17,
  "S+": 19,
  M: 22,
  "M+": 26,
  L: 30,
  XL: 36,
  XXL: 44,
};

export const SUB_COLORS = [
  "#ffffff",
  "#ffe000",
  "#33e0ff",
  "#28e05a",
  "#ff3cc7",
  "#ff3b30",
  "#0a0a0a",
];

export const SUB_LANGUAGES: { code: string; label: string }[] = [
  { code: "en", label: "English" },
  { code: "es", label: "Spanish" },
  { code: "fr", label: "French" },
  { code: "de", label: "German" },
  { code: "it", label: "Italian" },
  { code: "pt", label: "Portuguese" },
  { code: "nl", label: "Dutch" },
  { code: "ru", label: "Russian" },
  { code: "ja", label: "Japanese" },
  { code: "ko", label: "Korean" },
  { code: "zh", label: "Chinese" },
  { code: "ar", label: "Arabic" },
  { code: "hi", label: "Hindi" },
];

// Inline style for a subtitle line, shared by the settings preview + the player.
export function subtitleStyle(p: SubPrefs): React.CSSProperties {
  const shadow =
    p.shadow === "drop"
      ? "0 2px 6px rgba(0,0,0,0.95), 0 1px 2px rgba(0,0,0,0.9)"
      : p.shadow === "outline"
        ? "-1.5px -1.5px 0 #000, 1.5px -1.5px 0 #000, -1.5px 1.5px 0 #000, 1.5px 1.5px 0 #000, 0 0 5px rgba(0,0,0,0.9)"
        : "none";
  return {
    fontSize: `${SUB_SIZE_PX[p.size]}px`,
    color: p.color,
    textShadow: shadow,
    opacity: p.opacity / 100,
    fontWeight: 600,
    lineHeight: 1.3,
    background: p.background ? "rgba(0,0,0,0.62)" : "transparent",
    padding: p.background ? "0.15em 0.5em" : 0,
    borderRadius: p.background ? "0.4em" : 0,
    boxDecorationBreak: "clone" as const,
    WebkitBoxDecorationBreak: "clone" as const,
  };
}

interface SubCtx {
  prefs: SubPrefs;
  update: (patch: Partial<SubPrefs>) => void;
  reset: () => void;
}

const Ctx = createContext<SubCtx | null>(null);

export function SubtitleProvider({ children }: { children: React.ReactNode }) {
  const [prefs, setPrefs] = useState<SubPrefs>(DEFAULT_SUB_PREFS);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("calypso-subs");
      if (raw) setPrefs({ ...DEFAULT_SUB_PREFS, ...JSON.parse(raw) });
    } catch {}
  }, []);

  const persist = (next: SubPrefs) => {
    setPrefs(next);
    try {
      localStorage.setItem("calypso-subs", JSON.stringify(next));
    } catch {}
  };

  const update = useCallback(
    (patch: Partial<SubPrefs>) =>
      setPrefs((cur) => {
        const next = { ...cur, ...patch };
        try {
          localStorage.setItem("calypso-subs", JSON.stringify(next));
        } catch {}
        return next;
      }),
    [],
  );

  const reset = useCallback(() => persist(DEFAULT_SUB_PREFS), []);

  return <Ctx.Provider value={{ prefs, update, reset }}>{children}</Ctx.Provider>;
}

export function useSubs() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useSubs must be used within SubtitleProvider");
  return ctx;
}
