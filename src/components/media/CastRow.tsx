"use client";

import { img } from "@/lib/config";

interface Cast {
  id: number;
  name: string;
  character: string;
  profile_path: string | null;
}

export function CastRow({ cast }: { cast: Cast[] }) {
  const people = cast?.filter((c) => c.profile_path).slice(0, 16) ?? [];
  if (!people.length) return null;
  return (
    <div className="py-2">
      <h2 className="mb-4 px-4 font-display text-xl font-semibold tracking-tight sm:px-8 sm:text-2xl">
        Cast
      </h2>
      <div className="row-scroll flex gap-4 overflow-x-auto px-4 pb-2 sm:px-8">
        {people.map((p) => (
          <div key={p.id} className="w-[96px] shrink-0 text-center">
            <div className="mx-auto h-24 w-24 overflow-hidden rounded-full border border-border bg-surface-2 shadow-md">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={img(p.profile_path, "w185")!}
                alt={p.name}
                loading="lazy"
                className="h-full w-full object-cover"
              />
            </div>
            <p className="mt-2 truncate text-xs font-semibold">{p.name}</p>
            <p className="truncate text-[11px] text-muted">{p.character}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
