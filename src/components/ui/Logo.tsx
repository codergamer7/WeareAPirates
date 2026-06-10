import { SITE_NAME } from "@/lib/config";
import { cn } from "@/lib/utils";

// Compass-rose mark + wordmark. The star nods to navigation / treasure maps.
export function Logo({
  className,
  showText = true,
}: {
  className?: string;
  showText?: boolean;
}) {
  return (
    <span className={cn("inline-flex items-center gap-2.5 select-none", className)}>
      <span className="relative grid place-items-center">
        <svg
          viewBox="0 0 24 24"
          className="h-7 w-7 text-accent drop-shadow-[0_0_10px_var(--glow)]"
          fill="none"
        >
          <path
            d="M12 1.5l2.2 7.1 7.3.2-5.9 4.3 2.3 7-5.9-4.4-5.9 4.4 2.3-7L2.5 8.8l7.3-.2L12 1.5z"
            fill="currentColor"
            opacity="0.95"
          />
          <circle cx="12" cy="12" r="2.4" className="fill-background" />
          <circle cx="12" cy="12" r="1" fill="currentColor" />
        </svg>
      </span>
      {showText && (
        <span className="font-display text-[1.35rem] font-semibold tracking-tight leading-none">
          {SITE_NAME}
        </span>
      )}
    </span>
  );
}
