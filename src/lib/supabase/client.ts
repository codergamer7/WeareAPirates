"use client";

import { createBrowserClient } from "@supabase/ssr";
import { SUPABASE_CONFIGURED } from "@/lib/config";

// Returns a browser Supabase client, or null when env vars aren't set yet
// (lets the app boot for UI work before keys are pasted in).
export function createSupabaseBrowserClient() {
  if (!SUPABASE_CONFIGURED) return null;
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}

export type SupabaseBrowserClient = NonNullable<
  ReturnType<typeof createSupabaseBrowserClient>
>;
