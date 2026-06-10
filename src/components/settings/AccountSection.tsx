"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, ListVideo, LogOut, Shield } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { prettyDate, cn } from "@/lib/utils";
import { SectionHeader } from "@/components/settings/AppearanceSection";

export function AccountSection() {
  const { user, profile, isAdmin, signOut, refreshProfile } = useAuth();
  const [name, setName] = useState(profile?.display_name ?? "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const initial = (profile?.display_name || profile?.email || "?").charAt(0).toUpperCase();
  const dirty = name.trim() !== (profile?.display_name ?? "") && name.trim().length > 0;

  async function save() {
    if (!user || !dirty) return;
    const sb = createSupabaseBrowserClient();
    if (!sb) return;
    setSaving(true);
    await sb.from("profiles").update({ display_name: name.trim() }).eq("id", user.id);
    await refreshProfile();
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div>
      <SectionHeader title="Account" subtitle="Manage your profile and session." />

      <div className="mt-6 flex items-center gap-5">
        <div className="grid h-20 w-20 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-accent-bright to-accent text-3xl font-bold text-accent-foreground shadow-[0_8px_24px_var(--glow)]">
          {initial}
        </div>
        <div>
          <div className="flex items-center gap-2">
            <p className="font-display text-xl font-bold">{profile?.display_name}</p>
            {isAdmin && (
              <span className="flex items-center gap-1 rounded-full bg-accent/15 px-2 py-0.5 text-xs font-semibold text-accent">
                <Shield className="h-3 w-3" /> Admin
              </span>
            )}
          </div>
          <p className="text-sm text-muted">{profile?.email}</p>
          {profile?.created_at && (
            <p className="mt-0.5 text-xs text-muted">
              Aboard since {prettyDate(profile.created_at)}
            </p>
          )}
        </div>
      </div>

      <div className="mt-8 max-w-md">
        <label className="mb-1.5 block text-xs font-semibold uppercase tracking-widest text-muted">
          Display name
        </label>
        <div className="flex gap-2">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-xl border border-border bg-surface-2/60 px-4 py-3 text-sm outline-none focus:border-accent"
          />
          <button
            onClick={save}
            disabled={!dirty || saving}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-xl px-4 text-sm font-bold transition-colors",
              dirty
                ? "bg-accent text-accent-foreground"
                : "bg-surface-2 text-muted",
            )}
          >
            {saved ? <Check className="h-4 w-4" /> : null}
            {saved ? "Saved" : saving ? "…" : "Save"}
          </button>
        </div>
      </div>

      <div className="mt-8 flex flex-wrap gap-3">
        <Link
          href="/account"
          className="inline-flex items-center gap-2 rounded-full border border-border px-5 py-2.5 text-sm font-semibold transition-colors hover:border-accent hover:text-accent"
        >
          <ListVideo className="h-4 w-4" /> My Lists
        </Link>
        {isAdmin && (
          <Link
            href="/admin"
            className="inline-flex items-center gap-2 rounded-full border border-border px-5 py-2.5 text-sm font-semibold transition-colors hover:border-accent hover:text-accent"
          >
            <Shield className="h-4 w-4" /> Control Panel
          </Link>
        )}
        <button
          onClick={signOut}
          className="inline-flex items-center gap-2 rounded-full border border-red-500/30 px-5 py-2.5 text-sm font-semibold text-red-400 transition-colors hover:bg-red-500/10"
        >
          <LogOut className="h-4 w-4" /> Sign out
        </button>
      </div>
    </div>
  );
}
