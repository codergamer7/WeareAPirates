// Multi-theme engine. Each theme generates a full set of CSS variables that the
// ThemeProvider applies inline to <html>, re-coloring the whole app instantly.

export type ThemeCategory = "Base" | "Colors" | "Nature" | "Special";
export type Mode = "dark" | "light";

export interface ThemeDef {
  id: string;
  name: string;
  category: ThemeCategory;
  mode: Mode;
  accent: string; // swatch / preview bar color
  pair?: string; // counterpart id for the quick dark/light toggle
  vars: Record<string, string>;
}

interface Spec {
  id: string;
  name: string;
  category: ThemeCategory;
  mode: Mode;
  bgHue: number;
  bgSat?: number;
  accentHue: number;
  accentSat?: number;
  accentLight?: number;
  pair?: string;
}

function build(s: Spec): ThemeDef {
  const aS = s.accentSat ?? 85;
  const aL = s.accentLight ?? (s.mode === "dark" ? 58 : 48);
  const accent = `hsl(${s.accentHue} ${aS}% ${aL}%)`;
  const accentBright = `hsl(${s.accentHue} ${Math.min(100, aS + 6)}% ${Math.min(82, aL + 13)}%)`;
  const glow = `hsl(${s.accentHue} ${aS}% ${aL}% / ${s.mode === "dark" ? 0.34 : 0.24})`;
  // light accents (yellow→cyan, or very bright) read better with dark text
  const lightAccent = aL >= 68 || (s.accentHue >= 40 && s.accentHue <= 195 && aL >= 52);
  const accentFg = lightAccent ? "#0a0c10" : "#ffffff";
  const bgS = s.bgSat ?? (s.mode === "dark" ? 24 : 36);

  const vars =
    s.mode === "dark"
      ? {
          "--background": `hsl(${s.bgHue} ${bgS}% 6%)`,
          "--surface": `hsl(${s.bgHue} ${Math.max(0, bgS - 2)}% 9%)`,
          "--surface-2": `hsl(${s.bgHue} ${Math.max(0, bgS - 4)}% 14%)`,
          "--foreground": `hsl(${s.bgHue} 16% 95%)`,
          "--muted": `hsl(${s.bgHue} 12% 60%)`,
          "--border": `hsl(${s.bgHue} 25% 92% / 0.09)`,
          "--accent": accent,
          "--accent-bright": accentBright,
          "--accent-foreground": accentFg,
          "--glow": glow,
          "--shadow-color": "0, 0, 0",
        }
      : {
          "--background": `hsl(${s.bgHue} ${bgS}% 96%)`,
          "--surface": `hsl(${s.bgHue} ${bgS + 8}% 99%)`,
          "--surface-2": `hsl(${s.bgHue} ${Math.max(0, bgS - 8)}% 90%)`,
          "--foreground": `hsl(${s.bgHue} 28% 12%)`,
          "--muted": `hsl(${s.bgHue} 10% 38%)`,
          "--border": `hsl(${s.bgHue} 25% 12% / 0.12)`,
          "--accent": accent,
          "--accent-bright": accentBright,
          "--accent-foreground": accentFg,
          "--glow": glow,
          "--shadow-color": "30, 30, 40",
        };

  return {
    id: s.id,
    name: s.name,
    category: s.category,
    mode: s.mode,
    accent,
    pair: s.pair,
    vars,
  };
}

export const THEMES: ThemeDef[] = [
  // ---- Base ----
  build({ id: "calypso", name: "Calypso", category: "Base", mode: "dark", bgHue: 222, accentHue: 42, accentSat: 92, accentLight: 55, pair: "parchment" }),
  build({ id: "parchment", name: "Parchment", category: "Base", mode: "light", bgHue: 40, bgSat: 38, accentHue: 36, accentSat: 70, accentLight: 40, pair: "calypso" }),
  build({ id: "dark", name: "Dark", category: "Base", mode: "dark", bgHue: 220, bgSat: 8, accentHue: 0, accentSat: 0, accentLight: 92, pair: "light" }),
  build({ id: "light", name: "Light", category: "Base", mode: "light", bgHue: 220, bgSat: 12, accentHue: 222, accentSat: 16, accentLight: 22, pair: "dark" }),
  build({ id: "midnight", name: "Midnight", category: "Base", mode: "dark", bgHue: 224, bgSat: 30, accentHue: 210, accentSat: 90, accentLight: 66, pair: "snow" }),
  build({ id: "snow", name: "Snow", category: "Base", mode: "light", bgHue: 210, bgSat: 20, accentHue: 210, accentSat: 80, accentLight: 50, pair: "midnight" }),

  // ---- Colors ----
  build({ id: "blue", name: "Blue", category: "Colors", mode: "dark", bgHue: 222, accentHue: 214, accentSat: 90, accentLight: 60, pair: "blue-light" }),
  build({ id: "blue-light", name: "Blue Light", category: "Colors", mode: "light", bgHue: 214, accentHue: 214, accentSat: 85, accentLight: 52, pair: "blue" }),
  build({ id: "green", name: "Green", category: "Colors", mode: "dark", bgHue: 160, bgSat: 14, accentHue: 145, accentSat: 70, accentLight: 50, pair: "green-light" }),
  build({ id: "green-light", name: "Green Light", category: "Colors", mode: "light", bgHue: 150, accentHue: 145, accentSat: 65, accentLight: 40, pair: "green" }),
  build({ id: "purple", name: "Purple", category: "Colors", mode: "dark", bgHue: 264, accentHue: 268, accentSat: 85, accentLight: 65, pair: "purple-light" }),
  build({ id: "purple-light", name: "Purple Light", category: "Colors", mode: "light", bgHue: 264, accentHue: 268, accentSat: 75, accentLight: 56, pair: "purple" }),
  build({ id: "pink", name: "Pink", category: "Colors", mode: "dark", bgHue: 330, bgSat: 18, accentHue: 332, accentSat: 85, accentLight: 62, pair: "pink-light" }),
  build({ id: "pink-light", name: "Pink Light", category: "Colors", mode: "light", bgHue: 336, accentHue: 332, accentSat: 80, accentLight: 56, pair: "pink" }),
  build({ id: "crimson", name: "Crimson", category: "Colors", mode: "dark", bgHue: 350, bgSat: 20, accentHue: 352, accentSat: 80, accentLight: 56, pair: "rose-light" }),
  build({ id: "rose-light", name: "Rose Light", category: "Colors", mode: "light", bgHue: 350, accentHue: 350, accentSat: 75, accentLight: 52, pair: "crimson" }),

  // ---- Nature ----
  build({ id: "forest", name: "Forest", category: "Nature", mode: "dark", bgHue: 140, bgSat: 22, accentHue: 96, accentSat: 60, accentLight: 52, pair: "forest-light" }),
  build({ id: "forest-light", name: "Forest Light", category: "Nature", mode: "light", bgHue: 120, accentHue: 100, accentSat: 50, accentLight: 36, pair: "forest" }),
  build({ id: "ocean", name: "Ocean", category: "Nature", mode: "dark", bgHue: 198, bgSat: 30, accentHue: 188, accentSat: 85, accentLight: 55, pair: "ocean-light" }),
  build({ id: "ocean-light", name: "Ocean Light", category: "Nature", mode: "light", bgHue: 196, accentHue: 190, accentSat: 80, accentLight: 44, pair: "ocean" }),
  build({ id: "sunset", name: "Sunset", category: "Nature", mode: "dark", bgHue: 18, bgSat: 26, accentHue: 26, accentSat: 92, accentLight: 56, pair: "sunrise" }),
  build({ id: "sunrise", name: "Sunrise", category: "Nature", mode: "light", bgHue: 32, accentHue: 24, accentSat: 88, accentLight: 50, pair: "sunset" }),

  // ---- Special ----
  build({ id: "blackpink", name: "BLACKPINK", category: "Special", mode: "dark", bgHue: 320, bgSat: 8, accentHue: 332, accentSat: 95, accentLight: 60 }),
  build({ id: "sherbet", name: "Sherbet", category: "Special", mode: "light", bgHue: 16, bgSat: 60, accentHue: 8, accentSat: 85, accentLight: 62, pair: "sherbet-dark" }),
  build({ id: "sherbet-dark", name: "Sherbet Dark", category: "Special", mode: "dark", bgHue: 330, bgSat: 16, accentHue: 8, accentSat: 85, accentLight: 64, pair: "sherbet" }),
  build({ id: "mono", name: "Mono", category: "Special", mode: "dark", bgHue: 0, bgSat: 0, accentHue: 0, accentSat: 0, accentLight: 80, pair: "mono-light" }),
  build({ id: "mono-light", name: "Mono Light", category: "Special", mode: "light", bgHue: 0, bgSat: 0, accentHue: 0, accentSat: 0, accentLight: 20, pair: "mono" }),
];

export const DEFAULT_THEME_ID = "calypso";
export const THEME_CATEGORIES: ThemeCategory[] = ["Base", "Colors", "Nature", "Special"];

export const getTheme = (id: string): ThemeDef =>
  THEMES.find((t) => t.id === id) ?? THEMES[0];
