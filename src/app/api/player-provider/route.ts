import { NextResponse } from "next/server";
import { readLocalPlayerProvider } from "@/lib/app-settings";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  isPlayerProvider,
  type PlayerProvider,
} from "@/lib/player-provider";

const SETTINGS_KEY = "player_provider";
const REQUIRES_DURABLE_SETTINGS = process.env.VERCEL === "1";

export async function GET() {
  let provider: PlayerProvider = await readLocalPlayerProvider();
  const admin = createSupabaseAdminClient();

  if (admin) {
    const { data, error } = await admin
      .from("app_settings")
      .select("value")
      .eq("key", SETTINGS_KEY)
      .maybeSingle();
    if (error && REQUIRES_DURABLE_SETTINGS) {
      return NextResponse.json(
        {
          provider,
          warning:
            "Player provider storage is not set up. Using the default provider.",
        },
        { status: 503 },
      );
    }
    if (!error && isPlayerProvider(data?.value)) provider = data.value;
  }

  return NextResponse.json({ provider });
}
