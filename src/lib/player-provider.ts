export const PLAYER_PROVIDERS = ["vidking", "vidlink", "2embed"] as const;

export type PlayerProvider = (typeof PLAYER_PROVIDERS)[number];

export const DEFAULT_PLAYER_PROVIDER: PlayerProvider = "vidking";

export const PLAYER_PROVIDER_LABELS: Record<PlayerProvider, string> = {
  vidking: "Vidking",
  vidlink: "Vidlink",
  "2embed": "2Embed",
};

export function isPlayerProvider(value: unknown): value is PlayerProvider {
  return typeof value === "string" && PLAYER_PROVIDERS.includes(value as PlayerProvider);
}
