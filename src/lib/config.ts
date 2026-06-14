// Central site configuration. Change SITE_NAME / accent here to rebrand.
export const SITE_NAME = process.env.NEXT_PUBLIC_SITE_NAME?.trim() || "Calypso";
export const SITE_TAGLINE = "Your treasure of films & series";

// Brand accent (molten gold). Used across the UI and passed to embed players
// as their theme/color param (without the leading #).
export const ACCENT_HEX = "f0b429";

// TMDB image CDN.
export const TMDB_IMG = "https://image.tmdb.org/t/p";
export const img = (path: string | null | undefined, size: string = "w500") =>
  path ? `${TMDB_IMG}/${size}${path}` : null;

// Embed player bases.
export const VIDKING_BASE = "https://www.vidking.net/embed";
export const VIDSYNC_BASE = "https://vidsync.xyz/embed";
export const VIDLINK_BASE = "https://vidlink.pro";
export const TWOEMBED_BASE = "https://www.2embed.cc";
// Anime-only embeds (separate from the movie/series sources). Both support
// sub & dub via the URL. MegaPlay is MAL-keyed; TryEmbed is AniList-keyed.
export const MEGAPLAY_BASE = "https://megaplay.buzz/stream";
export const TRYEMBED_BASE = "https://tryembed.us.cc";

// True when the Supabase env vars are present, so the UI can show a friendly
// "setup required" state instead of crashing before keys are pasted in.
export const SUPABASE_CONFIGURED =
  !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
  !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// TMDB genre id -> label (movie + tv ids merged).
export const GENRES: Record<number, string> = {
  28: "Action",
  12: "Adventure",
  16: "Animation",
  35: "Comedy",
  80: "Crime",
  99: "Documentary",
  18: "Drama",
  10751: "Family",
  14: "Fantasy",
  36: "History",
  27: "Horror",
  10402: "Music",
  9648: "Mystery",
  10749: "Romance",
  878: "Science Fiction",
  10770: "TV Movie",
  53: "Thriller",
  10752: "War",
  37: "Western",
  10759: "Action & Adventure",
  10762: "Kids",
  10763: "News",
  10764: "Reality",
  10765: "Sci-Fi & Fantasy",
  10766: "Soap",
  10767: "Talk",
  10768: "War & Politics",
};

// Curated rows for the home page browse-by-genre section.
export const HOME_GENRES: { id: number; label: string }[] = [
  { id: 28, label: "Action" },
  { id: 35, label: "Comedy" },
  { id: 27, label: "Horror" },
  { id: 878, label: "Sci-Fi" },
  { id: 18, label: "Drama" },
  { id: 16, label: "Animation" },
];

export type MediaType = "movie" | "tv";
