import { NextRequest, NextResponse } from "next/server";
import { readLocalPlayerProvider, writeLocalPlayerProvider } from "@/lib/app-settings";
import { getServerUser } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  isPlayerProvider,
  type PlayerProvider,
} from "@/lib/player-provider";

const SETTINGS_KEY = "player_provider";

async function requireAdmin() {
  const user = await getServerUser();
  if (!user) return null;
  const admin = createSupabaseAdminClient();
  if (!admin) return null;
  const { data } = await admin
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (data?.role !== "admin") return null;
  return { admin };
}

export async function GET() {
  const ctx = await requireAdmin();
  if (!ctx) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  let provider: PlayerProvider = await readLocalPlayerProvider();
  const { data, error } = await ctx.admin
    .from("app_settings")
    .select("value")
    .eq("key", SETTINGS_KEY)
    .maybeSingle();
  if (!error && isPlayerProvider(data?.value)) provider = data.value;

  return NextResponse.json({ provider });
}

export async function POST(req: NextRequest) {
  const ctx = await requireAdmin();
  if (!ctx) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const provider = body.provider;
  if (!isPlayerProvider(provider)) {
    return NextResponse.json({ error: "Unknown player provider" }, { status: 400 });
  }

  const { error } = await ctx.admin.from("app_settings").upsert({
    key: SETTINGS_KEY,
    value: provider,
    updated_at: new Date().toISOString(),
  });

  if (error) {
    await writeLocalPlayerProvider(provider);
    return NextResponse.json({
      provider,
      persisted: "local",
      warning: "Supabase app_settings is unavailable; saved locally.",
    });
  }

  await writeLocalPlayerProvider(provider);
  return NextResponse.json({ provider });
}
