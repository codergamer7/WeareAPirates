import { WatchScreen } from "@/components/player/WatchScreen";

export default async function WatchEpisodePage({
  params,
}: {
  params: Promise<{ id: string; season: string; episode: string }>;
}) {
  const { id, season, episode } = await params;
  return (
    <WatchScreen
      kind="tv"
      id={id}
      season={Number(season)}
      episode={Number(episode)}
    />
  );
}
