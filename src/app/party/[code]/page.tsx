import { Suspense } from "react";
import { PartyRoom } from "@/components/party/PartyRoom";

export default async function PartyRoomPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  return (
    <Suspense fallback={<div className="min-h-screen" />}>
      <PartyRoom code={code.toUpperCase()} />
    </Suspense>
  );
}
