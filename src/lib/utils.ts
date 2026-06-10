import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// "2019-05-24" -> "2019"
export function yearOf(date?: string | null) {
  if (!date) return "";
  return date.slice(0, 4);
}

// Pretty release date, e.g. "May 24, 2019".
export function prettyDate(date?: string | null) {
  if (!date) return "TBA";
  const d = new Date(date);
  if (isNaN(d.getTime())) return "TBA";
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

// Minutes -> "2h 14m"
export function runtime(min?: number | null) {
  if (!min) return "";
  const h = Math.floor(min / 60);
  const m = min % 60;
  return h ? `${h}h ${m}m` : `${m}m`;
}

// Seconds -> "1:23:45" / "4:05"
export function clock(seconds?: number | null) {
  if (!seconds || seconds < 0) return "0:00";
  const s = Math.floor(seconds % 60);
  const m = Math.floor((seconds / 60) % 60);
  const h = Math.floor(seconds / 3600);
  const pad = (n: number) => n.toString().padStart(2, "0");
  return h ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
}
