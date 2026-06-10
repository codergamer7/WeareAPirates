import { cn } from "@/lib/utils";

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("shimmer rounded-xl", className)} />;
}

export function PosterSkeleton() {
  return (
    <div className="w-[150px] shrink-0 sm:w-[170px]">
      <Skeleton className="aspect-[2/3] w-full" />
      <Skeleton className="mt-2 h-3 w-3/4" />
    </div>
  );
}

export function RowSkeleton() {
  return (
    <div className="flex gap-3 overflow-hidden px-4 sm:px-8">
      {Array.from({ length: 8 }).map((_, i) => (
        <PosterSkeleton key={i} />
      ))}
    </div>
  );
}
