import { WatchScreen } from "@/components/player/WatchScreen";

export default async function WatchMoviePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <WatchScreen kind="movie" id={id} />;
}
