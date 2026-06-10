import { notFound } from "next/navigation";
import { BrowseClient } from "../BrowseClient";

export default async function BrowsePage({
  params,
}: {
  params: Promise<{ type: string }>;
}) {
  const { type } = await params;
  if (type !== "movie" && type !== "tv") notFound();
  return <BrowseClient type={type} />;
}
