export const PLAYER_PROVIDERS = ["vidking", "vidsync", "vidlink"] as const;

export type PlayerProvider = (typeof PLAYER_PROVIDERS)[number];

export const DEFAULT_PLAYER_PROVIDER: PlayerProvider = "vidking";

export const PLAYER_PROVIDER_LABELS: Record<PlayerProvider, string> = {
  vidking: "Vidking",
  vidsync: "Vidsync",
  vidlink: "Vidlink",
};

export function isPlayerProvider(value: unknown): value is PlayerProvider {
  return typeof value === "string" && PLAYER_PROVIDERS.includes(value as PlayerProvider);
}
