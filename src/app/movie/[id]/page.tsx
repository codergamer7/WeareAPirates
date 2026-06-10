import { DetailView } from "@/components/media/DetailView";

export default async function MoviePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <DetailView kind="movie" id={id} />;
}
