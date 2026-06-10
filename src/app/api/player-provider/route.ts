import { NextResponse } from "next/server";
import { readLocalPlayerProvider } from "@/lib/app-settings";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  isPlayerProvider,
  type PlayerProvider,
} from "@/lib/player-provider";

const SETTINGS_KEY = "player_provider";

export async function GET() {
  let provider: PlayerProvider = await readLocalPlayerProvider();
  const admin = createSupabaseAdminClient();

  if (admin) {
    const { data, error } = await admin
      .from("app_settings")
      .select("value")
      .eq("key", SETTINGS_KEY)
      .maybeSingle();
    if (!error && isPlayerProvider(data?.value)) provider = data.value;
  }

  return NextResponse.json({ provider });
}
