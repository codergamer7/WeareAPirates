"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Captions, Info, Palette, UserRound } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { SITE_NAME, SITE_TAGLINE } from "@/lib/config";
import { AppearanceSection } from "@/components/settings/AppearanceSection";
import { SubtitlesSection } from "@/components/settings/SubtitlesSection";
import { AccountSection } from "@/components/settings/AccountSection";
import { cn } from "@/lib/utils";

type Tab = "account" | "appearance" | "subtitles" | "about";

const NAV: { key: Tab; label: string; icon: React.ReactNode }[] = [
  { key: "account", label: "Account", icon: <UserRound className="h-[18px] w-[18px]" /> },
  { key: "appearance", label: "Appearance", icon: <Palette className="h-[18px] w-[18px]" /> },
  { key: "subtitles", label: "Subtitles", icon: <Captions className="h-[18px] w-[18px]" /> },
  { key: "about", label: "About", icon: <Info className="h-[18px] w-[18px]" /> },
];

export default function SettingsPage() {
  const { profile } = useAuth();
  const [tab, setTab] = useState<Tab>("appearance");

  const initial = (profile?.display_name || profile?.email || "?").charAt(0).toUpperCase();

  return (
    <div className="min-h-screen pt-16">
      <div className="mx-auto max-w-[1400px] px-4 py-8 sm:px-8">
        <div className="grid gap-8 lg:grid-cols-[250px_1fr]">
          {/* sidebar */}
          <aside className="lg:sticky lg:top-24 lg:self-start">
            <div className="mb-6 flex items-center gap-3 px-2">
              <div className="grid h-11 w-11 place-items-center rounded-full bg-gradient-to-br from-accent-bright to-accent text-lg font-bold text-accent-foreground">
                {initial}
              </div>
              <div className="min-w-0">
                <p className="truncate font-semibold">{profile?.display_name || "User"}</p>
                <p className="truncate text-xs text-muted">{profile?.email}</p>
              </div>
            </div>

            <nav className="flex gap-1 overflow-x-auto lg:flex-col">
              {NAV.map((n) => (
                <button
                  key={n.key}
                  onClick={() => setTab(n.key)}
                  className={cn(
                    "relative flex items-center gap-3 whitespace-nowrap rounded-xl px-3.5 py-2.5 text-[15px] font-medium transition-colors",
                    tab === n.key ? "text-accent" : "text-muted hover:text-foreground",
                  )}
                >
                  {tab === n.key && (
                    <motion.span
                      layoutId="settings-nav"
                      className="absolute inset-0 -z-10 rounded-xl bg-accent/12"
                      transition={{ type: "spring", stiffness: 400, damping: 32 }}
                    />
                  )}
                  {n.icon}
                  {n.label}
                </button>
              ))}
            </nav>
          </aside>

          {/* content */}
          <motion.div
            key={tab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
            className="min-w-0"
          >
            {tab === "account" && <AccountSection />}
            {tab === "appearance" && <AppearanceSection />}
            {tab === "subtitles" && <SubtitlesSection />}
            {tab === "about" && (
              <div>
                <h1 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">
                  About
                </h1>
                <p className="mt-1 text-sm text-muted">The vessel you’re sailing.</p>
                <div className="mt-6 rounded-2xl border border-border bg-surface/40 p-6">
                  <p className="font-display text-2xl font-bold text-gradient-gold">
                    {SITE_NAME}
                  </p>
                  <p className="mt-1 font-display italic text-muted">{SITE_TAGLINE}</p>
                  <p className="mt-4 max-w-prose text-sm leading-relaxed text-foreground/80">
                    A beautifully animated place to watch films &amp; series — powered by
                    Vidking, with metadata from TMDB &amp; OMDb and subtitles from Wyzie.
                    Pick a theme, tune your captions, and enjoy the voyage.
                  </p>
                </div>
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  );
}
