// Order drives the movie/series failover + the switcher slider. 2Embed is
// prioritized over Vidking (their slots are swapped).
export const PLAYER_PROVIDERS = ["2embed", "vidsync", "vidlink", "vidking"] as const;

export type PlayerProvider = (typeof PLAYER_PROVIDERS)[number];

export const DEFAULT_PLAYER_PROVIDER: PlayerProvider = "2embed";

export const PLAYER_PROVIDER_LABELS: Record<PlayerProvider, string> = {
  vidking: "Vidking",
  vidsync: "Vidsync",
  vidlink: "Vidlink",
  "2embed": "2Embed",
};

export function isPlayerProvider(value: unknown): value is PlayerProvider {
  return typeof value === "string" && PLAYER_PROVIDERS.includes(value as PlayerProvider);
}
