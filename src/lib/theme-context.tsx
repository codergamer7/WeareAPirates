"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import {
  DEFAULT_THEME_ID,
  getTheme,
  THEMES,
  type Mode,
  type ThemeDef,
} from "@/lib/themes";

interface ThemeCtx {
  themeId: string;
  current: ThemeDef;
  mode: Mode;
  /** alias of mode, kept for the dark/light toggle */
  theme: Mode;
  themes: ThemeDef[];
  setTheme: (id: string) => void;
  toggle: () => void;
}

const Ctx = createContext<ThemeCtx | null>(null);

function applyTheme(t: ThemeDef) {
  const root = document.documentElement;
  for (const [k, v] of Object.entries(t.vars)) root.style.setProperty(k, v);
  root.classList.toggle("dark", t.mode === "dark");
  root.classList.toggle("light", t.mode === "light");
  root.style.colorScheme = t.mode;
  try {
    localStorage.setItem("calypso-theme-id", t.id);
    localStorage.setItem("calypso-theme-mode", t.mode);
    localStorage.setItem("calypso-theme-vars", JSON.stringify(t.vars));
  } catch {}
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [themeId, setThemeId] = useState<string>(DEFAULT_THEME_ID);

  // sync to whatever the boot script applied
  useEffect(() => {
    let id = DEFAULT_THEME_ID;
    try {
      id = localStorage.getItem("calypso-theme-id") || DEFAULT_THEME_ID;
    } catch {}
    setThemeId(id);
    applyTheme(getTheme(id));
  }, []);

  const setTheme = useCallback((id: string) => {
    const t = getTheme(id);
    setThemeId(t.id);
    applyTheme(t);
  }, []);

  const toggle = useCallback(() => {
    const cur = getTheme(themeId);
    if (cur.pair) return setTheme(cur.pair);
    setTheme(cur.mode === "dark" ? "parchment" : "calypso");
  }, [themeId, setTheme]);

  const current = getTheme(themeId);

  return (
    <Ctx.Provider
      value={{
        themeId,
        current,
        mode: current.mode,
        theme: current.mode,
        themes: THEMES,
        setTheme,
        toggle,
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}

// Boot script — applies the saved theme's vars + mode before first paint.
export const themeBootScript = `(function(){try{var r=document.documentElement;var m=localStorage.getItem('calypso-theme-mode')||'dark';r.classList.add(m);r.style.colorScheme=m;var v=localStorage.getItem('calypso-theme-vars');if(v){var o=JSON.parse(v);for(var k in o){r.style.setProperty(k,o[k]);}}}catch(e){document.documentElement.classList.add('dark');}})();`;
