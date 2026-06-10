import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  DEFAULT_PLAYER_PROVIDER,
  isPlayerProvider,
  type PlayerProvider,
} from "@/lib/player-provider";

const SETTINGS_DIR = path.join(process.cwd(), ".calypso");
const SETTINGS_FILE = path.join(SETTINGS_DIR, "settings.json");

interface LocalSettings {
  player_provider?: PlayerProvider;
}

export async function readLocalPlayerProvider() {
  try {
    const raw = await readFile(SETTINGS_FILE, "utf8");
    const data = JSON.parse(raw) as LocalSettings;
    return isPlayerProvider(data.player_provider)
      ? data.player_provider
      : DEFAULT_PLAYER_PROVIDER;
  } catch {
    return DEFAULT_PLAYER_PROVIDER;
  }
}

export async function writeLocalPlayerProvider(provider: PlayerProvider) {
  await mkdir(SETTINGS_DIR, { recursive: true });
  await writeFile(
    SETTINGS_FILE,
    JSON.stringify({ player_provider: provider }, null, 2),
    "utf8",
  );
}
